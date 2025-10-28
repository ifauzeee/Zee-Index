import { NextResponse, NextRequest } from "next/server";
import { getAccessToken } from "@/lib/googleDrive";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const parentId = formData.get("parentId") as string | null;

    if (!file || !parentId) {
      return NextResponse.json(
        { error: "File dan ID folder induk diperlukan." },
        { status: 400 },
      );
    }

    const accessToken = await getAccessToken();
    const metadata = {
      name: file.name,
      parents: [parentId],
    };

    const body = new Blob([
      `--boundary\r\n`,
      `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
      `${JSON.stringify(metadata)}\r\n\r\n`,
      `--boundary\r\n`,
      `Content-Type: ${file.type}\r\n\r\n`,
      await file.arrayBuffer(),
      `\r\n--boundary--`,
    ]);

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=boundary`,
        },
        body,
      },
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data.error?.message || "Gagal mengunggah file ke Google Drive.",
      );
    }

    revalidateTag(`files-in-folder-${parentId}`);

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error." },
      { status: 500 },
    );
  }
}
