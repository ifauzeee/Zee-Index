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

        const { name, mimeType, size } = parsedBody.data;

        const finalName = name;

        const metadata = {
          name: finalName,
          mimeType,
          parents: [requestData.folderId],
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

        if (!contentRange || !isAllowedResumableUploadUrl(uploadUrl)) {
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
