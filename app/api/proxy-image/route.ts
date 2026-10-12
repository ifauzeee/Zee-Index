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
// librsvg (bundled with sharp < 0.35.5) is reachable through this route via
// image/svg+xml; reject it explicitly on top of the version bump (Z2-08).
const MAX_UPSTREAM_BYTES = 15 * 1024 * 1024;
const MAX_INPUT_PIXELS = 50_000_000;
// libvips sniffs the real format from magic bytes, so a mislabeled SVG can
// still reach the SVG loader even with a benign content-type header.
const SVG_MAGIC_PREFIXES = ["<?xml", "<svg", "<!--", "<!DOCTYPE"] as const;
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

export function looksLikeSvg(buffer: Buffer): boolean {
  const head = buffer
    .subarray(0, 256)
    .toString("utf8")
    .trimStart()
    .toLowerCase();
  return SVG_MAGIC_PREFIXES.some((prefix) => head.startsWith(prefix));
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

      if (!response.ok) {
        clear();
        return new NextResponse("Failed to fetch image", {
          status: response.status,
        });
      }

      const contentType = (response.headers.get("content-type") || "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (!contentType.startsWith("image/")) {
        clear();
        return new NextResponse("Invalid image content type", { status: 400 });
      }
      // Also reject SVG by magic bytes: libvips sniffs the real format, so a
      // mislabeled SVG (Content-Type: image/png) must not reach the loader.
      if (contentType === "image/svg+xml") {
        clear();
        return new NextResponse("Unsupported image content type", {
          status: 400,
        });
      }

      const buffer = await readBodyWithLimit(response, MAX_UPSTREAM_BYTES);
      clear();
      if (looksLikeSvg(buffer)) {
        return new NextResponse("Unsupported image content type", {
          status: 400,
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
      if (error instanceof Error && error.name === "AbortError") {
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
