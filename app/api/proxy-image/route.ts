import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import sharp from "sharp";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";
const IMAGE_PROXY_TIMEOUT_MS = 10_000;
const MAX_IMAGE_DIMENSION = 2048;
const MIN_IMAGE_QUALITY = 30;
const MAX_IMAGE_QUALITY = 95;
const MAX_IMAGE_REDIRECTS = 2;
const MAX_UPSTREAM_BYTES = 15 * 1024 * 1024;
const MAX_INPUT_PIXELS = 50_000_000;
// Only these formats are proxied. libvips picks its loader by sniffing the
// bytes, not the Content-Type, and its SVG/TIFF/JP2 loaders are a large
// parser surface (Z2-08), so both the header and the magic bytes must match
// this allowlist before sharp sees the buffer.
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);
const AVIF_BRANDS = new Set(["avif", "avis"]);
const VALID_IMAGE_HOSTS = [
  "googleusercontent.com",
  "google.com",
  "lh3.googleusercontent.com",
] as const;

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function isAllowedImageHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  return VALID_IMAGE_HOSTS.some(
    (host) => normalizedHost === host || normalizedHost.endsWith(`.${host}`),
  );
}

// The AbortController stays armed while the body streams in: a host that
// sends headers quickly then trickles the body must still hit the timeout.
// Callers must invoke clear() once the body has been fully consumed.
async function fetchValidatedImage(
  imageUrl: string,
): Promise<{ response: Response; clear: () => void }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    IMAGE_PROXY_TIMEOUT_MS,
  );
  const clear = () => clearTimeout(timeoutId);
  try {
    const response = await followValidatedRedirects(
      imageUrl,
      controller.signal,
    );
    return { response, clear };
  } catch (error) {
    clear();
    throw error;
  }
}

async function followValidatedRedirects(
  imageUrl: string,
  signal: AbortSignal,
  redirectsRemaining: number = MAX_IMAGE_REDIRECTS,
): Promise<Response> {
  const targetUrl = new URL(imageUrl);
  if (
    targetUrl.protocol !== "https:" ||
    !isAllowedImageHost(targetUrl.hostname)
  ) {
    throw new Error("Invalid image host");
  }

  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Zee-Index-Proxy/2.0",
    },
    redirect: "manual",
    signal,
  });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirectsRemaining <= 0) {
      throw new Error("Too many redirects");
    }

    const location = response.headers.get("location");
    await discardBody(response);
    if (!location) {
      throw new Error("Missing redirect location");
    }

    return followValidatedRedirects(
      new URL(location, targetUrl).toString(),
      signal,
      redirectsRemaining - 1,
    );
  }

  return response;
}

// Read the upstream body with a hard cap so a hostile host cannot buffer an
// unbounded response into memory before sharp ever sees it.
class UpstreamTooLargeError extends Error {}

async function readBodyWithLimit(
  response: Response,
  limit: number,
): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty image response body");

  const chunks: Buffer[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > limit) {
      await reader.cancel();
      throw new UpstreamTooLargeError("Image response exceeds size limit");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export type RasterFormat = "jpeg" | "png" | "gif" | "webp" | "avif";

/**
 * Identify an allowed raster format from its magic bytes, or null for
 * anything else (SVG in any encoding, SVGZ, TIFF, JP2, HTML, ...).
 */
export function detectRasterFormat(buffer: Buffer): RasterFormat | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }
  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  const ascii = (start: number, end: number) =>
    buffer.subarray(start, end).toString("latin1");
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return "gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && AVIF_BRANDS.has(ascii(8, 12))) return "avif";
  return null;
}

/** Release an upstream body we are not going to read. */
async function discardBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => {});
}

export const GET = createPublicRoute(
  async ({ request }) => {
    const url = new URL(request.url);
    const imageUrl = url.searchParams.get("url");
    const width = clampNumber(
      parseInt(url.searchParams.get("w") || "0", 10),
      0,
      MAX_IMAGE_DIMENSION,
    );
    const height = clampNumber(
      parseInt(url.searchParams.get("h") || "0", 10),
      0,
      MAX_IMAGE_DIMENSION,
    );
    const quality = clampNumber(
      parseInt(url.searchParams.get("q") || "80", 10),
      MIN_IMAGE_QUALITY,
      MAX_IMAGE_QUALITY,
    );

    if (!imageUrl) {
      return new NextResponse("Missing url parameter", { status: 400 });
    }

    try {
      const { response, clear } = await fetchValidatedImage(imageUrl);
      let buffer: Buffer;
      try {
        if (!response.ok) {
          await discardBody(response);
          return new NextResponse("Failed to fetch image", {
            status: response.status,
          });
        }

        const contentType = (response.headers.get("content-type") || "")
          .split(";")[0]
          .trim()
          .toLowerCase();
        if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
          await discardBody(response);
          return new NextResponse("Unsupported image content type", {
            status: 415,
          });
        }

        const declaredLength = Number(response.headers.get("content-length"));
        if (declaredLength > MAX_UPSTREAM_BYTES) {
          await discardBody(response);
          throw new UpstreamTooLargeError("Image response exceeds size limit");
        }

        buffer = await readBodyWithLimit(response, MAX_UPSTREAM_BYTES);
      } finally {
        clear();
      }

      // The header can lie; libvips trusts the bytes, so check those too.
      if (!detectRasterFormat(buffer)) {
        return new NextResponse("Unsupported image content type", {
          status: 415,
        });
      }

      let transformer = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS });

      if (width > 0 || height > 0) {
        transformer = transformer.resize({
          width: width > 0 ? width : undefined,
          height: height > 0 ? height : undefined,
          fit: "cover",
        });
      }

      const processedBuffer = await transformer.webp({ quality }).toBuffer();

      const cacheControl = "public, max-age=31536000, immutable";

      return new NextResponse(new Uint8Array(processedBuffer), {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": cacheControl,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Image proxy error");
      if (error instanceof UpstreamTooLargeError) {
        return new NextResponse("Image response exceeds size limit", {
          status: 413,
        });
      }
      // Abort surfaces as a DOMException, which is not an Error subclass in
      // every runtime, so match on the name only.
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError"
      ) {
        return new NextResponse("Upstream image request timed out", {
          status: 504,
        });
      }
      return new NextResponse("Internal Server Error", { status: 500 });
    }
  },
  // The Edge middleware rate limiter runs on a per-process in-memory KV
  // (Z2-10), so this Redis-backed limit is currently the effective one for
  // this route. Revisit once the middleware migrates to proxy.ts.
  { rateLimit: "API" },
);
