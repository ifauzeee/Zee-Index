import { logger } from "@/lib/logger";

import { getErrorMessage } from "@/lib/errors";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/drive";
import { z } from "zod";
import { invalidateFolderCache } from "@/lib/cache";
import { logActivity } from "@/lib/activityLogger";
import { createEditorRoute } from "@/lib/api-middleware";
import { driveIdSchema } from "@/lib/drive/ids";
import { canModifyAll } from "@/lib/editor-access";
const moveSchema = z.object({
  fileId: driveIdSchema,
  currentParentId: driveIdSchema,
  newParentId: driveIdSchema,
});
export const POST = createEditorRoute(
  async ({ request, body, session }) => {
    try {
      const { fileId, currentParentId, newParentId } = body;

      if (
        !(await canModifyAll(request, session, [
          fileId,
          currentParentId,
          newParentId,
        ]))
      ) {
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }

      if (currentParentId === newParentId) {
        return NextResponse.json({
          success: true,
          message: "Folder tujuan sama dengan folder saat ini.",
        });
      }

      const accessToken = await getAccessToken();
      const query = new URLSearchParams({
        addParents: newParentId,
        removeParents: currentParentId,
      });
      const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?${query}`;

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
      const errorMessage = getErrorMessage(
        error,
        "Terjadi kesalahan tidak dikenal.",
      );
      logger.error({ err: error }, "Move API Error");
      return NextResponse.json(
        { error: errorMessage || "Internal Server Error." },
        { status: 500 },
      );
    }
  },
  { bodySchema: moveSchema },
);
