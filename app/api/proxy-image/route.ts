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

async function fetchValidatedImage(
  imageUrl: string,
  redirectsRemaining: number = MAX_IMAGE_REDIRECTS,
): Promise<Response> {
  const targetUrl = new URL(imageUrl);
  if (
    targetUrl.protocol !== "https:" ||
    !isAllowedImageHost(targetUrl.hostname)
  ) {
    throw new Error("Invalid image host");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    IMAGE_PROXY_TIMEOUT_MS,
  );

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Zee-Index-Proxy/2.0",
      },
      redirect: "manual",
      signal: controller.signal,
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectsRemaining <= 0) {
        throw new Error("Too many redirects");
      }

      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Missing redirect location");
      }

      return fetchValidatedImage(
        new URL(location, targetUrl).toString(),
        redirectsRemaining - 1,
      );
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
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
      const response = await fetchValidatedImage(imageUrl);

      if (!response.ok) {
        return new NextResponse("Failed to fetch image", {
          status: response.status,
        });
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        return new NextResponse("Invalid image content type", { status: 400 });
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      let transformer = sharp(buffer);

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
      return new NextResponse("Internal Server Error", { status: 500 });
    }
  },
  { rateLimit: false },
);
