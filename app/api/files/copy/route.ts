import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { getAccessToken, getFileDetailsFromDrive } from "@/lib/drive";
import { z } from "zod";
import { invalidateFolderCache } from "@/lib/cache";
import { logActivity } from "@/lib/activityLogger";

const copySchema = z.object({
  fileId: z.string().min(1),
  destinationId: z.string().optional(),
  newName: z.string().optional(),
});

export const POST = createAdminRoute(
  async ({ body, session }) => {
    try {
      const { fileId, destinationId, newName } = body;
      const fileDetails = await getFileDetailsFromDrive(fileId);

      if (
        !fileDetails ||
        !fileDetails.parents ||
        fileDetails.parents.length === 0
      ) {
        throw new Error(
          "Tidak dapat menemukan file asli atau informasi folder induknya.",
        );
      }
      const targetParentId = destinationId || fileDetails.parents[0];

      const accessToken = await getAccessToken();
      const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/copy?supportsAllDrives=true`;

      const response = await fetch(driveUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parents: [targetParentId],
          name: newName || `Salinan dari ${fileDetails.name}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Google Drive API Error: ${errorData.error?.message || "Gagal membuat salinan."}`,
        );
      }

      await invalidateFolderCache(targetParentId);
      const copiedFile = await response.json();

      await logActivity("COPY", {
        itemName: copiedFile.name || fileId,
        userEmail: session?.user?.email,
        status: "success",
      });

      return NextResponse.json({ success: true, file: copiedFile });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak dikenal.";
      logger.error({ err: errorMessage }, "Copy API Error");
      return NextResponse.json(
        { error: "Internal Server Error.", details: errorMessage },
        { status: 500 },
      );
    }
  },
  { bodySchema: copySchema },
);
