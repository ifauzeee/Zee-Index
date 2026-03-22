export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { getAccessToken } from "@/lib/drive";
import { invalidateFolderCache } from "@/lib/cache";

export const PATCH = createAdminRoute(async ({ request }) => {
  try {
    const formData = await request.formData();
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
});
