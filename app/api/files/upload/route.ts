import { logger } from "@/lib/logger";

import { getErrorMessage } from "@/lib/errors";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/drive";
import { createEditorRoute } from "@/lib/api-middleware";
import { logActivity } from "@/lib/activityLogger";
import { invalidateFolderCache } from "@/lib/cache";
import { z } from "zod";
import { getActiveProvider } from "@/lib/storage/providers";
export const maxDuration = 60;

const uploadInitBodySchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  parentId: z.string().min(1),
  size: z.number().nonnegative(),
});

const uploadQuerySchema = z
  .object({
    type: z.enum(["init", "chunk"]),
    uploadUrl: z.string().url().optional(),
    parentId: z.string().optional(),
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

// ponytail: providers without session streaming (S3/WebDAV) buffer in memory;
// swap to their multipart/stream APIs when uploads >~100MB matter there too.
const providerBuffers = new Map<
  string,
  { chunks: Buffer[]; totalSize: number }
>();

export const POST = createEditorRoute(
  async ({ request, session, query }) => {
    const uploadType = query.type;

    try {
      if (uploadType === "init") {
        const body = await request.json();
        const parsedBody = uploadInitBodySchema.safeParse(body);
        if (!parsedBody.success) {
          return NextResponse.json(
            {
              error: "Input upload init tidak valid.",
              details: parsedBody.error.issues,
            },
            { status: 400 },
          );
        }

        const { name, mimeType, parentId, size } = parsedBody.data;

        if (parentId.startsWith("local-storage:")) {
          return NextResponse.json({
            uploadUrl: `local-storage-upload://${encodeURIComponent(
              parentId,
            )}/${encodeURIComponent(name)}`,
          });
        }

        const provider = getActiveProvider();
        if (
          provider &&
          (parentId === provider.rootId ||
            parentId.startsWith(provider.idPrefix))
        ) {
          // Use session-based streaming upload if the provider supports it
          // (e.g. Dropbox upload sessions). This avoids buffering the entire
          // file in server memory — each chunk is forwarded directly.
          if (provider.startUploadSession) {
            const sessionToken = await provider.startUploadSession(
              parentId,
              name,
            );
            return NextResponse.json({
              uploadUrl: `provider-session://${sessionToken}`,
            });
          }

          // Fallback: buffer entire file server-side (for providers without
          // session support — S3, WebDAV). Works for small files; large files
          // need provider-specific streaming (add session methods above).
          return NextResponse.json({
            uploadUrl: `provider-upload://${encodeURIComponent(name)}`,
            useProvider: true,
            mimeType,
            size,
          });
        }

        const accessToken = await getAccessToken();
        const metadata = {
          name,
          mimeType,
          parents: [parentId],
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

        if (!response.ok) {
          throw new Error(
            "Gagal menginisialisasi sesi upload dengan Google Drive.",
          );
        }

        const uploadUrl = response.headers.get("Location");
        return NextResponse.json({ uploadUrl });
      } else if (uploadType === "chunk") {
        const uploadUrl = query.uploadUrl!;
        const parentId = query.parentId;

        if (uploadUrl.startsWith("provider-session://")) {
          const sessionToken = uploadUrl.slice("provider-session://".length);
          const provider = getActiveProvider();
          const parent = parentId || provider?.rootId || "";

          if (!provider?.appendUploadSession || !provider.finishUploadSession) {
            return NextResponse.json(
              { error: "Storage provider tidak mendukung session upload." },
              { status: 400 },
            );
          }

          const chunkBuffer = await request.arrayBuffer();
          const rangeMatch = (request.headers.get("Content-Range") || "").match(
            /bytes (\d+)-(\d+)\/(\d+)/,
          );
          const isLast =
            !!rangeMatch && Number(rangeMatch[2]) + 1 === Number(rangeMatch[3]);

          if (!isLast) {
            await provider.appendUploadSession(sessionToken, chunkBuffer);
            return NextResponse.json({ status: "partial" });
          }

          const file = await provider.finishUploadSession(
            sessionToken,
            chunkBuffer,
          );

          if (!file) {
            throw new Error("Gagal mengunggah file ke storage provider.");
          }

          if (parent) {
            await invalidateFolderCache(parent);
          }

          await logActivity("UPLOAD", {
            itemName: file.name,
            itemId: file.id,
            itemSize: file.size,
            userEmail: session.user?.email,
            status: "success",
            metadata: {
              operation: "file_upload",
              fileId: file.id,
              parentId: parent,
              uploadType: "chunk",
            },
          });

          return NextResponse.json({ status: "completed", file });
        }

        if (uploadUrl.startsWith("provider-upload://")) {
          const fileName = decodeURIComponent(
            uploadUrl.slice("provider-upload://".length),
          );
          const provider = getActiveProvider();
          const parent = parentId || provider?.rootId || "";

          if (!provider) {
            return NextResponse.json(
              { error: "Tidak ada storage provider aktif." },
              { status: 400 },
            );
          }

          const contentRange = request.headers.get("Content-Range") || "";
          const rangeMatch = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
          const chunkBuffer = Buffer.from(await request.arrayBuffer());

          const entry = providerBuffers.get(uploadUrl) || {
            chunks: [],
            totalSize: 0,
          };
          entry.chunks.push(chunkBuffer);
          entry.totalSize += chunkBuffer.length;
          providerBuffers.set(uploadUrl, entry);

          const isLast =
            rangeMatch && Number(rangeMatch[2]) + 1 === Number(rangeMatch[3]);

          if (!isLast) {
            return NextResponse.json({ status: "partial" });
          }

          const fullBuffer = Buffer.concat(entry.chunks);
          providerBuffers.delete(uploadUrl);

          const file = await provider.uploadFile(
            parent,
            fileName,
            fullBuffer,
            request.headers.get("Content-Type") || undefined,
          );

          if (!file) {
            throw new Error("Gagal mengunggah file ke storage provider.");
          }

          if (parent) {
            await invalidateFolderCache(parent);
          }

          await logActivity("UPLOAD", {
            itemName: file.name,
            itemId: file.id,
            itemSize: file.size,
            userEmail: session.user?.email,
            status: "success",
            metadata: {
              operation: "file_upload",
              fileId: file.id,
              parentId: parent,
              uploadType: "chunk",
            },
          });

          return NextResponse.json({ status: "completed", file });
        }

        if (uploadUrl.startsWith("local-storage-upload://")) {
          const { saveLocalChunk } = await import("@/lib/storage/local");
          const chunkBuffer = await request.arrayBuffer();
          const contentRange = request.headers.get("Content-Range") || "";

          const result = await saveLocalChunk(
            uploadUrl,
            chunkBuffer,
            contentRange,
          );

          if (result.status === "completed" && result.file) {
            if (parentId) {
              await invalidateFolderCache(parentId);
            }

            await logActivity("UPLOAD", {
              itemName: result.file.name,
              itemId: result.file.id,
              itemSize: result.file.size,
              userEmail: session.user?.email,
              status: "success",
              metadata: {
                operation: "file_upload",
                fileId: result.file.id,
                parentId: parentId || undefined,
                uploadType: "chunk",
              },
            });
          }

          return NextResponse.json(result);
        }

        const contentRange = request.headers.get("Content-Range");
        const contentLength = request.headers.get("Content-Length");

        if (
          !uploadUrl.startsWith("https://www.googleapis.com/") ||
          !contentRange
        ) {
          return NextResponse.json(
            { error: "Parameter uploadUrl tidak valid atau header kurang." },
            { status: 400 },
          );
        }

        const chunkBuffer = await request.arrayBuffer();
        const driveResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Length":
              contentLength || chunkBuffer.byteLength.toString(),
            "Content-Range": contentRange,
          },
          body: chunkBuffer,
        });

        if (driveResponse.status === 308) {
          return NextResponse.json({ status: "partial" });
        }

        if (driveResponse.ok) {
          const fileData = await driveResponse.json();

          if (parentId) {
            await invalidateFolderCache(parentId);
          }

          await logActivity("UPLOAD", {
            itemName: fileData.name,
            itemId: fileData.id,
            itemSize: fileData.size,
            userEmail: session.user?.email,
            status: "success",
            metadata: {
              operation: "file_upload",
              fileId: fileData.id,
              parentId: parentId || undefined,
              mimeType: fileData.mimeType,
              uploadType: "chunk",
            },
          });
          return NextResponse.json({ status: "completed", file: fileData });
        }

        throw new Error("Gagal mengunggah chunk ke Google Drive.");
      } else {
        return NextResponse.json(
          { error: "Invalid upload type" },
          { status: 400 },
        );
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(
        error,
        "Terjadi kesalahan tidak dikenal.",
      );
      logger.error({ err: error }, "Upload API Error");
      return NextResponse.json(
        { error: errorMessage || "Internal Server Error." },
        { status: 500 },
      );
    }
  },
  { querySchema: uploadQuerySchema },
);
