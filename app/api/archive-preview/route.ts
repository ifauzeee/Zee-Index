import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getAccessToken } from "@/lib/googleDrive";
import JSZip, { JSZipObject } from "jszip";
import { isAccessRestricted } from "@/lib/securityUtils";

interface JSZipFileWithData extends JSZipObject {
  _data: {
    uncompressedSize: number;
  };
}

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

  const isRestricted = await isAccessRestricted(fileId);
  if (isRestricted) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
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
      size: file.dir ? 0 : (file as JSZipFileWithData)._data.uncompressedSize,
      isFolder: file.dir,
    }));

    return NextResponse.json(content);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";
    console.error("Archive Preview API Error:", errorMessage);
    return NextResponse.json(
      { error: "Gagal memproses file arsip.", details: errorMessage },
      { status: 500 },
    );
  }
}
