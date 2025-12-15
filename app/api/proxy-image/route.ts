import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const targetUrl = new URL(imageUrl);
    if (
      !targetUrl.hostname.endsWith("googleusercontent.com") &&
      !targetUrl.hostname.endsWith("google.com")
    ) {
      return new NextResponse("Invalid image host", { status: 400 });
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Zee-Index-Proxy/1.0",
      },
    });

    if (!response.ok) {
      return new NextResponse("Failed to fetch image", {
        status: response.status,
      });
    }

    const contentType = response.headers.get("Content-Type") || "image/jpeg";
    const cacheControl = "public, max-age=31536000, immutable";

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
      },
    });
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
