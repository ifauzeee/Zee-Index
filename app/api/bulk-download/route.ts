import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { getAccessToken } from "@/lib/drive";
import JSZip from "jszip";
import { isAccessRestricted } from "@/lib/securityUtils";
import { z } from "zod";

const bulkDownloadSchema = z.object({
  fileIds: z
    .array(z.string().min(1))
    .min(1, "Parameter fileIds tidak valid.")
    .max(20, "Maksimal 20 file per unduhan sekaligus."),
});

export const POST = createPublicRoute(
  async ({ body, session }) => {
    try {
      const { fileIds } = body;

      const accessToken = await getAccessToken();
      const zip = new JSZip();

      for (const fileId of fileIds) {
        if (session?.user?.role !== "ADMIN") {
          const isRestricted = await isAccessRestricted(
            fileId,
            [],
            session?.user?.email,
          );
          if (isRestricted) continue;
        }

        const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const detailsUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name`;

        const detailsResponse = await fetch(detailsUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!detailsResponse.ok) continue;

        const fileDetails = await detailsResponse.json();
        const fileName = fileDetails.name || fileId;

        const fileResponse = await fetch(driveUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (fileResponse.ok) {
          const fileBuffer = await fileResponse.arrayBuffer();
          zip.file(fileName, fileBuffer);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const headers = new Headers();
      headers.set("Content-Type", "application/zip");
      headers.set("Content-Disposition", 'attachment; filename="download.zip"');

      return new NextResponse(zipBlob, { status: 200, headers });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak dikenal.";
      logger.error({ err: errorMessage });
      return NextResponse.json(
        { error: "Internal Server Error." },
        { status: 500 },
      );
    }
  },
  { includeSession: true, rateLimit: false, bodySchema: bulkDownloadSchema },
);
