import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { getAccessToken, listFilesFromDrive } from "@/lib/drive";
import JSZip from "jszip";
import { isAccessRestricted } from "@/lib/securityUtils";
import { z } from "zod";

const bulkDownloadSchema = z
  .object({
    fileIds: z
      .array(z.string().min(1))
      .min(1, "Parameter fileIds tidak valid.")
      .max(20, "Maksimal 20 file per unduhan sekaligus.")
      .optional(),
    folderId: z.string().min(1, "Parameter folderId tidak valid.").optional(),
  })
  .refine((value) => value.fileIds || value.folderId, {
    message: "Parameter fileIds atau folderId wajib diisi.",
  });

export const POST = createPublicRoute(
  async ({ body, session }) => {
    try {
      const { fileIds, folderId } = body;

      const accessToken = await getAccessToken();
      const zip = new JSZip();

      // ponytail: folder mode lists one level only (no recursion). Recursive ZIP needs a
      // descendant walk + size guard — add when nested-folder zips are actually needed.
      let items: { id: string; name?: string }[] =
        fileIds?.map((id) => ({ id })) ?? [];
      if (folderId) {
        const result = await listFilesFromDrive(folderId, null, 200, false);
        items = result.files
          .filter((f) => f.mimeType !== "application/vnd.google-apps.folder")
          .map((f) => ({ id: f.id, name: f.name }));
      }

      for (const item of items) {
        if (session?.user?.role !== "ADMIN") {
          const isRestricted = await isAccessRestricted(
            item.id,
            [],
            session?.user?.email,
          );
          if (isRestricted) continue;
        }

        const driveUrl = `https://www.googleapis.com/drive/v3/files/${item.id}?alt=media`;
        let fileName: string = item.name ?? "";

        if (!fileName) {
          const detailsUrl = `https://www.googleapis.com/drive/v3/files/${item.id}?fields=name`;
          const detailsResponse = await fetch(detailsUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!detailsResponse.ok) continue;

          const fileDetails = await detailsResponse.json();
          fileName = fileDetails.name || item.id;
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
