import { NextResponse, type NextRequest } from "next/server";
import { getAccessToken, getFileDetailsFromDrive } from "@/lib/googleDrive";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { logActivity } from "@/lib/activityLogger";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET(request: NextRequest) {
  const { success } = await checkRateLimit(request, "download");
  if (!success) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan unduhan. Silakan tunggu sebentar." },
      { status: 429 },
    );
  }

  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");
  const shareToken = searchParams.get("share_token");

  let isShareTokenValid = false;
  if (shareToken) {
    try {
      const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
      const { payload } = await jwtVerify(shareToken, secret);
      const isBlocked = await kv.get(`zee-index:blocked:${payload.jti}`);
      if (isBlocked) throw new Error("Tautan ini telah dibatalkan.");
      isShareTokenValid = true;
    } catch (error) {
      console.error("Verifikasi share token gagal:", error);
    }
  }

  if (!session && !isShareTokenValid) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  if (!fileId) {
    return NextResponse.json(
      { error: "Parameter fileId tidak ditemukan." },
      { status: 400 },
    );
  }

  try {
    const accessToken = await getAccessToken();
    const fileDetails = await getFileDetailsFromDrive(fileId);

    if (!fileDetails || !fileDetails.size) {
      return NextResponse.json(
        { error: "File tidak ditemukan." },
        { status: 404 },
      );
    }

    const range = request.headers.get("range");
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${accessToken}`);
    if (range) {
      headers.set("Range", range);
    }

    const googleResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers },
    );

    if (!googleResponse.ok) {
      return NextResponse.json(
        { error: "Gagal mengambil dari Google Drive" },
        { status: googleResponse.status },
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", fileDetails.mimeType);

    const encodedFileName = encodeURIComponent(fileDetails.name).replace(
      /['()]/g,
      escape,
    );

    responseHeaders.set(
      "Content-Disposition",
      `inline; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
    );

    responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
    responseHeaders.set("Pragma", "no-cache");
    responseHeaders.set("Expires", "0");
    responseHeaders.set("X-Accel-Buffering", "no");

    if (googleResponse.headers.get("Content-Range")) {
      responseHeaders.set(
        "Content-Range",
        googleResponse.headers.get("Content-Range")!,
      );
    }
    if (googleResponse.headers.get("Content-Length")) {
      responseHeaders.set(
        "Content-Length",
        googleResponse.headers.get("Content-Length")!,
      );
    }
    responseHeaders.set("Accept-Ranges", "bytes");

    if (!range) {
      logActivity("DOWNLOAD", {
        itemName: fileDetails.name,
        itemSize: fileDetails.size,
        userEmail: session?.user?.email,
      }).catch((e) => console.error("Gagal mencatat log aktivitas:", e));
    }

    return new Response(googleResponse.body, {
      status: googleResponse.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    console.error("Download API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error." },
      { status: 500 },
    );
  }
}