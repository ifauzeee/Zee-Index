import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/drive";
import { z } from "zod";
import { logActivity } from "@/lib/activityLogger";
import { invalidateFolderCache } from "@/lib/cache";
import { createEditorRoute } from "@/lib/api-middleware";

const moveSchema = z.object({
  fileIds: z.array(z.string().min(1)),
  currentParentId: z.string().min(1),
  newParentId: z.string().min(1),
});
export const POST = createEditorRoute(
  async ({ body, session }) => {
    try {
      const { fileIds, currentParentId, newParentId } = body;

      if (currentParentId === newParentId) {
        return NextResponse.json({
          success: true,
          message: "Folder tujuan sama dengan folder saat ini.",
        });
      }

      const accessToken = await getAccessToken();

      const batch = fileIds.map((fileId) => {
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentId}&removeParents=${currentParentId}`;
        return fetch(driveUrl, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      });

      const results = await Promise.all(batch);
      const failedMoves = results.filter((res) => !res.ok);

      if (failedMoves.length < fileIds.length) {
        await invalidateFolderCache(currentParentId);
        await invalidateFolderCache(newParentId);
        for (const fileId of fileIds) {
          await invalidateFolderCache(fileId);
        }
      }

      await logActivity("MOVE", {
        itemName: `${fileIds.length} files/folders`,
        userEmail: session?.user?.email,
        destinationFolder: newParentId,
        status: failedMoves.length > 0 ? "failure" : "success",
        error:
          failedMoves.length > 0
            ? `${failedMoves.length} item gagal dipindahkan.`
            : undefined,
      });

      if (failedMoves.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `${
              fileIds.length - failedMoves.length
            } item berhasil dipindahkan, ${failedMoves.length} gagal.`,
          },
          { status: 207 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `${fileIds.length} item berhasil dipindahkan.`,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak dikenal.";
      logger.error({ err: error }, "Bulk Move API Error");
      return NextResponse.json(
        { error: errorMessage || "Internal Server Error." },
        { status: 500 },
      );
    }
  },
  { bodySchema: moveSchema },
);
