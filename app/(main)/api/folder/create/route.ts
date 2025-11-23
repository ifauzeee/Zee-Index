import { NextResponse, NextRequest } from "next/server";
import { getAccessToken } from "@/lib/googleDrive";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { z } from "zod";
import { logActivity } from "@/lib/activityLogger";
import { kv } from "@vercel/kv";
import { invalidateFolderCache } from "@/lib/cache";

const sanitizeString = (str: string) => str.replace(/<[^>]*>?/gm, "");

const createFolderSchema = z.object({
  folderName: z
    .string()
    .min(1, { message: "Nama folder tidak boleh kosong." })
    .transform((val) => sanitizeString(val)),
  parentId: z.string().min(1, { message: "Folder induk diperlukan." }),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = createFolderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { folderName, parentId } = validation.data;
    const accessToken = await getAccessToken();

    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    };

    const response = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fileMetadata),
    });

    const data = await response.json();
    if (!response.ok) {
      await logActivity("UPLOAD", {
        itemName: folderName,
        userEmail: session.user.email,
        status: "failure",
        error: data.error?.message || "Gagal membuat folder di Google Drive.",
      });
      throw new Error(
        data.error?.message || "Gagal membuat folder di Google Drive.",
      );
    }

    await invalidateFolderCache(parentId);

    const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
    if (rootFolderId) {
      await kv.del(`zee-index:folder-tree:${rootFolderId}`);
    }

    await logActivity("UPLOAD", {
      itemName: folderName,
      userEmail: session.user.email,
      status: "success",
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";
    console.error("Create Folder API Error:", error);
    return NextResponse.json(
      { error: errorMessage || "Internal Server Error." },
      { status: 500 },
    );
  }
}
