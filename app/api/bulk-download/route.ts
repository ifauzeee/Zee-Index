import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/googleDrive";
import JSZip from "jszip";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { isAccessRestricted } from "@/lib/securityUtils";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const { fileIds } = await request.json();
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: "Parameter fileIds tidak valid." },
        { status: 400 },
      );
    }

    if (fileIds.length > 20) {
      return NextResponse.json(
        { error: "Maksimal 20 file per unduhan sekaligus." },
        { status: 400 },
      );
    }

    const accessToken = await getAccessToken();
    const zip = new JSZip();

    for (const fileId of fileIds) {
      if (session?.user?.role !== "ADMIN") {
        const isRestricted = await isAccessRestricted(fileId);
        if (isRestricted) continue;
      }

      const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const detailsUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name`;

      const detailsResponse = await fetch(detailsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!detailsResponse.ok) continue;

      const fileDetails = await detailsResponse.json();
      const fileName = fileDetails.name || fileId;

      const fileResponse = await fetch(driveUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (fileResponse.ok) {
        const fileBuffer = await fileResponse.arrayBuffer();
        zip.file(fileName, fileBuffer);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", 'attachment; filename="download.zip"');

    return new NextResponse(zipBlob, { status: 200, headers });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";
    console.error(errorMessage);
    return NextResponse.json(
      { error: "Internal Server Error." },
      { status: 500 },
    );
  }
}
