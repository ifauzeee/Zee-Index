import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { getAccessToken } from "@/lib/drive";
import { kv } from "@/lib/kv";
import { logActivity } from "@/lib/activityLogger";
import { REDIS_KEYS } from "@/lib/constants";
import {
  fileRequestUploadInitSchema,
  parseFileRequestLink,
} from "@/lib/link-payloads";
import { z } from "zod";

export const maxDuration = 60;
const GOOGLE_UPLOAD_HOST = "www.googleapis.com";
const GOOGLE_UPLOAD_PATH_PREFIX = "/upload/drive/v3/files";

const fileRequestUploadQuerySchema = z
  .object({
    type: z.enum(["init", "chunk"]),
    token: z.string().min(1),
    uploadUrl: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "chunk" && !value.uploadUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["uploadUrl"],
        message: "uploadUrl wajib diisi untuk chunk upload.",
      });
    }
  });

export function isAllowedResumableUploadUrl(uploadUrl: string): boolean {
  try {
    const parsed = new URL(uploadUrl);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === GOOGLE_UPLOAD_HOST &&
      parsed.pathname.startsWith(GOOGLE_UPLOAD_PATH_PREFIX) &&
      parsed.searchParams.has("upload_id")
    );
  } catch {
    return false;
  }
}

async function sendUploadNotificationEmail(
  requestData: any,
  fileName: string,
  fileSizeStr: string,
) {
  const adminEmails =
    process.env.ADMIN_EMAILS?.split(",")
      .map((email: string) => email.trim())
      .filter(Boolean) || [];

  if (adminEmails.length === 0) return;

  try {
    const { sendMail } = await import("@/lib/mailer");
    const { formatBytes } = await import("@/lib/utils");
    const sizeFormatted = formatBytes(parseInt(fileSizeStr) || 0);

    await sendMail({
      to: adminEmails,
      subject: `[Zee Index] File Request Upload: ${fileName}`,
      html: `
        <h3>Notifikasi Unggah File Request</h3>
        <p>File baru telah berhasil diunggah melalui tautan File Request:</p>
        <ul>
          <li><b>Judul Request:</b> ${requestData.title}</li>
          <li><b>Nama File:</b> ${fileName}</li>
          <li><b>Ukuran:</b> ${sizeFormatted}</li>
          <li><b>Folder Tujuan:</b> ${requestData.folderName}</li>
          <li><b>Tanggal Unggah:</b> ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</li>
        </ul>
        <p>Silakan masuk ke dashboard admin untuk memeriksa file.</p>
      `,
    });
  } catch (err) {
    logger.error({ err }, "Failed to send upload notification email");
  }
}

export const POST = createPublicRoute(
  async ({ request, query }) => {
    const uploadType = query.type;
    const token = query.token;

    const requestData = parseFileRequestLink(
      await kv.hget(REDIS_KEYS.FILE_REQUESTS, token),
    );
    if (!requestData || Date.now() > requestData.expiresAt) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 403 },
      );
    }

    try {
      const accessToken = await getAccessToken();

      if (uploadType === "init") {
        const parsedBody = fileRequestUploadInitSchema.safeParse(
          await request.json(),
        );
        if (!parsedBody.success) {
          return NextResponse.json(
            { error: "Missing params" },
            { status: 400 },
          );
        }

        const { name, mimeType, size, subfolder } = parsedBody.data;

        let targetFolderId = requestData.folderId;
        if (subfolder && subfolder.trim()) {
          const sanitizedSubfolder = subfolder.trim().replace(/[\/\\]/g, "_");
          if (sanitizedSubfolder) {
            if (targetFolderId.startsWith("local-storage:")) {
              targetFolderId = `${targetFolderId}/${sanitizedSubfolder}`;
            } else {
              // Google Drive folder search/create
              const queryStr = `name = '${sanitizedSubfolder.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${targetFolderId}' in parents and trashed = false`;
              const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id)`;
              const searchRes = await fetch(searchUrl, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              let existingFolderId = null;
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.files && searchData.files.length > 0) {
                  existingFolderId = searchData.files[0].id;
                }
              }

              if (existingFolderId) {
                targetFolderId = existingFolderId;
              } else {
                const createRes = await fetch(
                  "https://www.googleapis.com/drive/v3/files",
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      name: sanitizedSubfolder,
                      mimeType: "application/vnd.google-apps.folder",
                      parents: [targetFolderId],
                    }),
                  },
                );
                if (!createRes.ok) {
                  throw new Error("Failed to create subfolder in Google Drive");
                }
                const folderData = await createRes.json();
                targetFolderId = folderData.id;
              }
            }
          }
        }

        if (targetFolderId.startsWith("local-storage:")) {
          return NextResponse.json({
            uploadUrl: `local-storage-upload://${encodeURIComponent(
              targetFolderId,
            )}/${encodeURIComponent(name)}`,
          });
        }

        const metadata = {
          name,
          mimeType,
          parents: [targetFolderId],
        };

        const response = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "X-Upload-Content-Length": size.toString(),
              "X-Upload-Content-Type": mimeType,
            },
            body: JSON.stringify(metadata),
          },
        );

        if (!response.ok) throw new Error("Failed to init upload");
        const uploadUrl = response.headers.get("Location");
        return NextResponse.json({ uploadUrl });
      } else if (uploadType === "chunk") {
        const uploadUrl = query.uploadUrl!;
        const contentRange = request.headers.get("Content-Range");

        if (!contentRange) {
          return NextResponse.json(
            { error: "Missing params or invalid upload URL" },
            { status: 400 },
          );
        }

        if (uploadUrl.startsWith("local-storage-upload://")) {
          const { saveLocalChunk } = await import("@/lib/storage/local");
          const chunkBuffer = await request.arrayBuffer();

          const result = await saveLocalChunk(
            uploadUrl,
            chunkBuffer,
            contentRange,
          );

          if (result.status === "completed" && result.file) {
            const rolesToInvalidate = ["ADMIN", "USER", "GUEST"];
            for (const role of rolesToInvalidate) {
              await kv.del(
                `folder:content:${requestData.folderId}:${role}:page1`,
              );
            }

            await logActivity("UPLOAD", {
              itemName: result.file.name,
              itemSize: result.file.size,
              userEmail: "Public Uploader",
              destinationFolder: requestData.folderName,
            });

            await sendUploadNotificationEmail(
              requestData,
              result.file.name,
              result.file.size || "0",
            );
          }

          return NextResponse.json(result);
        }

        if (!isAllowedResumableUploadUrl(uploadUrl)) {
          return NextResponse.json(
            { error: "Missing params or invalid upload URL" },
            { status: 400 },
          );
        }

        const chunkBuffer = await request.arrayBuffer();

        const driveResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Length": chunkBuffer.byteLength.toString(),
            "Content-Range": contentRange,
          },
          body: chunkBuffer,
        });

        if (driveResponse.status === 308) {
          return NextResponse.json({ status: "partial" });
        }

        if (driveResponse.ok) {
          const fileData = await driveResponse.json();

          const rolesToInvalidate = ["ADMIN", "USER", "GUEST"];
          for (const role of rolesToInvalidate) {
            await kv.del(
              `folder:content:${requestData.folderId}:${role}:page1`,
            );
          }

          await logActivity("UPLOAD", {
            itemName: fileData.name,
            itemSize: fileData.size,
            userEmail: "Public Uploader",
            destinationFolder: requestData.folderName,
          });

          await sendUploadNotificationEmail(
            requestData,
            fileData.name,
            fileData.size || "0",
          );

          return NextResponse.json({ status: "completed", file: fileData });
        }

        throw new Error("Chunk upload failed");
      }
    } catch (error: unknown) {
      logger.error({ err: error }, "Public Upload Error");
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  },

  { rateLimit: false, querySchema: fileRequestUploadQuerySchema },
);
