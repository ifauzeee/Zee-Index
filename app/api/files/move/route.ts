import { NextResponse, NextRequest } from "next/server";
import { getAccessToken } from "@/lib/drive";
import { z } from "zod";
import { invalidateFolderCache } from "@/lib/cache";
import { logActivity } from "@/lib/activityLogger";

const moveSchema = z.object({
  fileId: z.string().min(1),
  currentParentId: z.string().min(1),
  newParentId: z.string().min(1),
});

import { withEditorSession } from "@/lib/api-middleware";
import { type Session } from "next-auth";

export const POST = withEditorSession(
  async (request: NextRequest, context: { params?: any }, session: Session) => {
    try {
      const body = await request.json();
      const validation = moveSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: "Input tidak valid", details: validation.error.issues },
          { status: 400 },
        );
      }

      const { fileId, currentParentId, newParentId } = validation.data;

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

      await logActivity("MOVE", {
        itemName: data.name || fileId,
        userEmail: session?.user?.email,
        destinationFolder: newParentId,
        status: "success",
      });

      return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak dikenal.";
      console.error("Move API Error:", error);
      return NextResponse.json(
        { error: errorMessage || "Internal Server Error." },
        { status: 500 },
      );
    }
  },
);
