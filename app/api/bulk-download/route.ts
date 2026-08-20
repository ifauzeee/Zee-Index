import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { getAccessToken } from "@/lib/drive";
import JSZip from "jszip";
import { isAccessRestricted } from "@/lib/securityUtils";
import { MAX_ZIP_TOTAL_BYTES } from "@/lib/constants";
import { z } from "zod";

const bulkDownloadSchema = z.object({
  fileIds: z
    .array(z.string().min(1))
    .min(1, "Parameter fileIds tidak valid.")
    .max(20, "Maksimal 20 file per unduhan sekaligus."),
});

const ZIP_TOO_LARGE_MESSAGE = `Total ukuran file melebihi batas ${Math.floor(MAX_ZIP_TOTAL_BYTES / 1024 / 1024)}MB. Unduh file satu per satu.`;

export const POST = createPublicRoute(
  async ({ body, session }) => {
    try {
      const { fileIds } = body;

      const accessToken = await getAccessToken();
      const zip = new JSZip();

      const items: { id: string; name?: string }[] =
        fileIds?.map((id) => ({ id })) ?? [];

      let totalSize = 0;
      for (const item of items) {
        if (session?.user?.role !== "ADMIN") {
          const isRestricted = await isAccessRestricted(
            item.id,
            [],
            session?.user?.email,
          );
          if (isRestricted) continue;
        }

        const driveUrl = `https://www.googleapis.com/drive/v3/files/${item.id}?alt=media&supportsAllDrives=true`;
        let fileName: string = item.name ?? "";

        if (!fileName) {
          const detailsUrl = `https://www.googleapis.com/drive/v3/files/${item.id}?fields=name,size&supportsAllDrives=true`;
          const detailsResponse = await fetch(detailsUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!detailsResponse.ok) continue;

          const fileDetails = await detailsResponse.json();
          fileName = fileDetails.name || item.id;

          totalSize += Number(fileDetails.size) || 0;
          if (totalSize > MAX_ZIP_TOTAL_BYTES) {
            return NextResponse.json(
              { error: ZIP_TOO_LARGE_MESSAGE },
              { status: 413 },
            );
          }
        }

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
