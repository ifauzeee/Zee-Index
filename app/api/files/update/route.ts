export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { getAccessToken, getFileDetailsFromDrive } from "@/lib/drive";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { z } from "zod";
import { invalidateFolderCache } from "@/lib/cache";

const updateSchema = z.object({
  fileId: z.string().min(1),
  newContent: z.string(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { fileId, newContent } = validation.data;
    const fileDetails = await getFileDetailsFromDrive(fileId);

    if (
      !fileDetails ||
      !fileDetails.parents ||
      fileDetails.parents.length === 0
    ) {
      throw new Error(
        "Tidak dapat menemukan file atau informasi folder induk.",
      );
    }
    const parentId = fileDetails.parents[0];

    const accessToken = await getAccessToken();
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;

    const response = await fetch(uploadUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": fileDetails.mimeType,
      },
      body: newContent,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Google Drive API Error: ${
          errorData.error?.message || "Gagal menyimpan perubahan."
        }`,
      );
    }

    await invalidateFolderCache(parentId);
    const updatedFile = await response.json();
    return NextResponse.json({ success: true, file: updatedFile });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";
    console.error("Update API Error:", errorMessage);
    return NextResponse.json(
      { error: "Internal Server Error.", details: errorMessage },
      { status: 500 },
    );
  }
}
