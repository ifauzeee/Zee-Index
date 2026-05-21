import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/drive";
import { z } from "zod";
import { invalidateFolderCache } from "@/lib/cache";
import { logActivity } from "@/lib/activityLogger";
import { createEditorRoute } from "@/lib/api-middleware";

const moveSchema = z.object({
  fileId: z.string().min(1),
  currentParentId: z.string().min(1),
  newParentId: z.string().min(1),
});
export const POST = createEditorRoute(
  async ({ body, session }) => {
    try {
      const { fileId, currentParentId, newParentId } = body;

      if (currentParentId === newParentId) {
        return NextResponse.json({
          success: true,
          message: "Folder tujuan sama dengan folder saat ini.",
        });
      }

      const accessToken = await getAccessToken();
      const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentId}&removeParents=${currentParentId}`;

      const response = await fetch(driveUrl, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error?.message || "Gagal memindahkan file di Google Drive.",
        );
      }

      await invalidateFolderCache(currentParentId);
      await invalidateFolderCache(newParentId);
      await invalidateFolderCache(fileId);

      await logActivity("MOVE", {
        itemName: data.name || fileId,
        itemId: fileId,
        userEmail: session?.user?.email,
        destinationFolder: newParentId,
        status: "success",
        metadata: {
          fileId,
          sourceParentId: currentParentId,
          destinationParentId: newParentId,
        },
      });

      return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak dikenal.";
      logger.error({ err: error }, "Move API Error");
      return NextResponse.json(
        { error: errorMessage || "Internal Server Error." },
        { status: 500 },
      );
    }
  },
  { bodySchema: moveSchema },
);
