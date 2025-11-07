import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getAccessToken } from "@/lib/googleDrive";
import JSZip from "jszip";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json(
      { error: "Parameter fileId tidak ditemukan." },
      { status: 400 },
    );
  }

  try {
    const accessToken = await getAccessToken();
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const fileResponse = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "Gagal mengunduh file dari Google Drive." },
        { status: fileResponse.status },
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const zip = await JSZip.loadAsync(fileBuffer);

    const content = Object.values(zip.files).map((file) => ({
      name: file.name,
      size: file.dir ? 0 : (file as any)._data.uncompressedSize,
      isFolder: file.dir,
    }));

    return NextResponse.json(content);
  } catch (error: any) {
    console.error("Archive Preview API Error:", error.message);
    return NextResponse.json(
      { error: "Gagal memproses file arsip.", details: error.message },
      { status: 500 },
    );
  }
}