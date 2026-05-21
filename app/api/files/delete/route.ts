import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAccessToken, getFileDetailsFromDrive } from "@/lib/drive";
import { deleteLocalFile } from "@/lib/storage/local";
import { z } from "zod";
import { logActivity } from "@/lib/activityLogger";
import { invalidateFolderCache } from "@/lib/cache";
import { createAdminRoute } from "@/lib/api-middleware";

const deleteSchema = z.object({
  fileId: z.string().min(1),
});

export const POST = createAdminRoute(
  async ({ body, session }) => {
    let fileDetails: { name?: string; parents?: string[] } | null = null;
    try {
      const { fileId } = body;

      if (fileId.startsWith("local-storage:")) {
        const localPath = fileId.replace("local-storage:", "");
        await deleteLocalFile(localPath);

        await logActivity("DELETE", {
          itemName: localPath,
          userEmail: session?.user?.email,
          status: "success",
        });

        const parts = localPath.split("/").filter(Boolean);
        if (parts.length > 1) {
          parts.pop();
          await invalidateFolderCache(`local-storage:${parts.join("/")}`);
        } else {
          await invalidateFolderCache("local-storage:");
        }
        await invalidateFolderCache(fileId);

        return NextResponse.json({ success: true });
      }

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
            `Google Drive API Error: ${
              errorData.error?.message || "Gagal menghapus file."
            }`,
          );
        } catch {
          throw new Error(`Google Drive API Error: Status ${response.status}`);
        }
      }

      await logActivity("DELETE", {
        itemName: fileDetails?.name,
        userEmail: session?.user?.email,
        status: "success",
      });

      await invalidateFolderCache(parentId);
      await invalidateFolderCache(fileId);

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak dikenal.";
      await logActivity("DELETE", {
        itemName: fileDetails?.name || "Unknown",
        userEmail: session?.user?.email,
        status: "failure",
        error: errorMessage,
      });
      logger.error({ err: errorMessage }, "Delete API Error");
      return NextResponse.json(
        { error: "Internal Server Error.", details: errorMessage },
        { status: 500 },
      );
    }
  },
  { bodySchema: deleteSchema },
);
