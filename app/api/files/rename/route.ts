import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAccessToken, getFileDetailsFromDrive } from "@/lib/drive";
import { z } from "zod";
import { invalidateFolderCache } from "@/lib/cache";
import { logActivity } from "@/lib/activityLogger";
import { createEditorRoute } from "@/lib/api-middleware";

const sanitizeString = (str: string) => str.replace(/<[^>]*>?/gm, "");

const renameSchema = z.object({
  fileId: z.string().min(1),
  newName: z
    .string()
    .min(1, { message: "Nama baru tidak boleh kosong." })
    .transform((val) => sanitizeString(val)),
});
export const POST = createEditorRoute(
  async ({ body, session }) => {
    try {
      const { fileId, newName } = body;
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
      const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;

      const response = await fetch(driveUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Google Drive API Error: ${
            errorData.error?.message || "Gagal mengubah nama file."
          }`,
        );
      }

      await invalidateFolderCache(parentId);
      await invalidateFolderCache(fileId);
      const updatedFile = await response.json();

      await logActivity("RENAME", {
        itemName: `${fileDetails.name} → ${newName}`,
        userEmail: session?.user?.email,
        status: "success",
      });

      return NextResponse.json({ success: true, file: updatedFile });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak dikenal.";
      logger.error({ err: errorMessage }, "Rename API Error");
      return NextResponse.json(
        { error: "Internal Server Error.", details: errorMessage },
        { status: 500 },
      );
    }
  },
  { bodySchema: renameSchema },
);
