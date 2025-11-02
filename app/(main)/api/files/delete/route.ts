import { NextResponse, NextRequest } from "next/server";
import { getAccessToken, getFileDetailsFromDrive } from "@/lib/googleDrive";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/activityLogger";

const deleteSchema = z.object({
  fileId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  let fileDetails: { name?: string; parents?: string[] } | null = null;

  try {
    const body = await request.json();
    const validation = deleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { fileId } = validation.data;

    fileDetails = await getFileDetailsFromDrive(fileId);

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
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;

    const response = await fetch(driveUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status !== 204) {
      try {
        const errorData = await response.json();
        throw new Error(
          `Google Drive API Error: ${errorData.error?.message || "Gagal menghapus file."}`,
        );
      } catch (e) {
        throw new Error(`Google Drive API Error: Status ${response.status}`);
      }
    }

    await logActivity("DELETE", {
      itemName: fileDetails?.name,
      userEmail: session?.user?.email,
      status: "success",
    });

    revalidateTag(`files-in-folder-${parentId}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await logActivity("DELETE", {
      itemName: fileDetails?.name || "Unknown",
      userEmail: session?.user?.email,
      status: "failure",
      error: error.message,
    });

    console.error("Delete API Error:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error.", details: error.message },
      { status: 500 },
    );
  }
}
