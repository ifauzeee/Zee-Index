import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getAccessToken } from "@/lib/googleDrive";
import { invalidateFolderCache } from "@/lib/cache";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const fileId = formData.get("fileId") as string;
    const parentId = formData.get("parentId") as string;

    if (!file || !fileId) {
      return NextResponse.json(
        { error: "Missing file or fileId" },
        { status: 400 },
      );
    }

    const accessToken = await getAccessToken();
    const buffer = await file.arrayBuffer();

    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": file.type,
        },
        body: buffer,
      },
    );

    if (!response.ok) throw new Error("Failed to update media");

    if (parentId) {
      await invalidateFolderCache(parentId);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
