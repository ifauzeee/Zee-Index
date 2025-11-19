import { NextResponse, type NextRequest } from "next/server";
import { getAccessToken, getFileDetailsFromDrive } from "@/lib/googleDrive";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { logActivity } from "@/lib/activityLogger";

export async function GET(request: NextRequest) {
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
    return NextResponse.json(
      { error: "Akses ditolak. Diperlukan autentikasi." },
      { status: 401 },
    );
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
        { error: "File tidak ditemukan atau ukurannya tidak diketahui." },
        { status: 404 },
      );
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Google Drive API Error:", error);
      return NextResponse.json(
        { error: "Gagal mengunduh file dari Google Drive." },
        { status: response.status },
      );
    }
    
    await logActivity("DOWNLOAD", {
      itemName: fileDetails.name,
      itemSize: fileDetails.size,
      userEmail: session?.user?.email,
    });

    const readableStream = response.body;

    return new Response(readableStream, {
      status: 200,
      headers: {
        "Content-Type": fileDetails.mimeType!,
        "Content-Length": fileDetails.size!,
        "Content-Disposition": `inline; filename="${fileDetails.name}"`,
      },
    });

  } catch (error: any) {
    console.error("Download API Error:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error." },
      { status: 500 },
    );
  }
}