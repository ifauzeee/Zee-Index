import { NextResponse, type NextRequest } from "next/server";
import { getAccessToken, getFileDetailsFromDrive } from "@/lib/drive";
import { logActivity } from "@/lib/activityLogger";
import { trackBandwidth } from "@/lib/analyticsTracker";
import { logger } from "@/lib/logger";
import { ERROR_MESSAGES } from "@/lib/constants";
import { kv } from "@/lib/kv";
import {
  validateDownloadRequest,
  prepareGoogleDriveUrl,
  prepareResponseHeaders,
} from "@/lib/services/download";

export const dynamic = "force-dynamic";

export async function HEAD(request: NextRequest) {
  return GET(request);
}

export async function GET(request: NextRequest) {
  try {
    const { context, session, error } = await validateDownloadRequest(request);
    if (error) {
      return NextResponse.json(
        { error: error.error },
        { status: error.status },
      );
    }

    const { fileId, range } = context;
    logger.info({ fileId }, "[Download] Starting download");

    const [accessToken, fileDetails] = await Promise.all([
      getAccessToken(),
      getFileDetailsFromDrive(fileId),
    ]);

    if (!fileDetails) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.FILE_NOT_FOUND },
        { status: 404 },
      );
    }

    if (fileDetails.mimeType === "application/vnd.google-apps.folder") {
      return NextResponse.json(
        { error: ERROR_MESSAGES.FOLDER_DOWNLOAD_NOT_SUPPORTED },
        { status: 400 },
      );
    }

    const { url, mimeType, filename } = prepareGoogleDriveUrl(
      fileId,
      fileDetails,
    );

    const googleRequestHeaders = new Headers();
    googleRequestHeaders.set("Authorization", `Bearer ${accessToken}`);
    googleRequestHeaders.set("User-Agent", "Zee-Index-Streamer/1.0");
    googleRequestHeaders.set("Accept-Encoding", "identity");

    const isVideoOrAudio =
      mimeType.startsWith("video/") || mimeType.startsWith("audio/");
    const isGoogleDoc = fileDetails.mimeType.startsWith(
      "application/vnd.google-apps.",
    );

    if (range && !isGoogleDoc) {
      googleRequestHeaders.set("Range", range);
    } else if (isVideoOrAudio && !isGoogleDoc && fileDetails.size) {
      const initialChunkSize = Math.min(
        2 * 1024 * 1024,
        parseInt(fileDetails.size),
      );
      googleRequestHeaders.set("Range", `bytes=0-${initialChunkSize - 1}`);
    }

    if (request.method === "HEAD") {
      const headHeaders = prepareResponseHeaders(
        mimeType,
        filename,
        null,
        null,
        null as any,
        true,
      );
      if (fileDetails.size) headHeaders.set("Content-Length", fileDetails.size);
      headHeaders.set("Accept-Ranges", "bytes");
      return new Response(null, { status: 200, headers: headHeaders });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const googleResponse = await fetch(url, {
      headers: googleRequestHeaders,
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!googleResponse.ok) {
      const errorJson = await googleResponse.json().catch(() => ({}));
      logger.error({ errorJson, fileId }, "Google Drive API Error");
      return NextResponse.json(
        {
          error:
            errorJson.error?.message ||
            "Gagal mengambil file dari Google Drive",
        },
        { status: googleResponse.status },
      );
    }

    const responseHeaders = prepareResponseHeaders(
      mimeType,
      filename,
      range,
      request.headers.get("Sec-Fetch-Dest"),
      googleResponse,
    );

    if (!range) {
      const forwardedFor = request.headers.get("x-forwarded-for");
      const realIp = request.headers.get("x-real-ip");
      const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : (realIp || "anonymous");
      const userIdentifier = session?.user?.email || ip;

      const dedupeKey = `loop_prevent:download:${fileId}:${userIdentifier}`;
      const isDuplicate = await kv.get(dedupeKey);

      if (!isDuplicate) {
        await kv.set(dedupeKey, "1", { ex: 5 });

        logActivity("DOWNLOAD", {
          itemName: fileDetails.name,
          itemSize: fileDetails.size || "0",
          userEmail: session?.user?.email,
        }).catch((e) => logger.error({ err: e }, "Gagal mencatat log aktivitas"));

        const downloadSize = parseInt(fileDetails.size || "0", 10);
        if (downloadSize > 0) {
          trackBandwidth(downloadSize).catch(() => { });
        }
      } else {
        logger.info({ fileId, userIdentifier }, "[Download] Skipping duplicate log");
      }
    }

    return new Response(googleResponse.body, {
      status: googleResponse.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    logger.error({ err: error }, "Download API Error");
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      },
      { status: 500 },
    );
  }
}
