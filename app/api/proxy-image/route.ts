import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get("url");
  const width = parseInt(url.searchParams.get("w") || "0");
  const height = parseInt(url.searchParams.get("h") || "0");
  const quality = parseInt(url.searchParams.get("q") || "80");

  if (!imageUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const targetUrl = new URL(imageUrl);
    const validHosts = [
      "googleusercontent.com",
      "google.com",
      "lh3.googleusercontent.com",
    ];

    if (!validHosts.some((host) => targetUrl.hostname.endsWith(host))) {
      return new NextResponse("Invalid image host", { status: 400 });
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Zee-Index-Proxy/2.0",
      },
    });

    if (!response.ok) {
      return new NextResponse("Failed to fetch image", {
        status: response.status,
      });
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
    console.error("Image proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
