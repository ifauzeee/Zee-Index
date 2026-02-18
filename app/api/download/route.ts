import { NextResponse, type NextRequest } from "next/server";
import { getAccessToken, getFileDetailsFromDrive } from "@/lib/drive";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { logActivity } from "@/lib/activityLogger";
import { trackBandwidth } from "@/lib/analyticsTracker";
import { checkRateLimit } from "@/lib/ratelimit";
import { isAccessRestricted } from "@/lib/securityUtils";
import { logger } from "@/lib/logger";
import {
  MIME_TYPES,
  EXPORT_TYPE_MAP,
  REDIS_KEYS,
  ERROR_MESSAGES,
  GOOGLE_DRIVE_API_BASE_URL,
} from "@/lib/constants";
export const dynamic = "force-dynamic";

export async function HEAD(request: NextRequest) {
  return GET(request);
}

export async function GET(request: NextRequest) {
  const range = request.headers.get("range");

  if (!range) {
    const { success } = await checkRateLimit(request, "DOWNLOAD");
    if (!success) {
      return NextResponse.json(
        {
          error: ERROR_MESSAGES.DOWNLOAD_LIMIT_EXCEEDED,
        },
        { status: 429 },
      );
    }
  }

  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");
  const shareToken = searchParams.get("share_token");
  const accessTokenParam = searchParams.get("access_token");

  if (shareToken) {
    try {
      const shareSecretKey = process.env.SHARE_SECRET_KEY;
      if (shareSecretKey && shareSecretKey.length >= 32) {
        const secret = new TextEncoder().encode(shareSecretKey);
        const { payload } = await jwtVerify(shareToken, secret);
        const isBlocked = await kv.get(
          `${REDIS_KEYS.SHARE_BLOCKED}${payload.jti}`,
        );
        if (isBlocked) throw new Error(ERROR_MESSAGES.SHARE_LINK_REVOKED);

        if (payload.loginRequired && !session) {
          throw new Error("Login required.");
        }
      }
    } catch {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_SHARE_TOKEN },
        { status: 401 },
      );
    }
  }

  if (!fileId) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.MISSING_FILE_ID },
      { status: 400 },
    );
  }

  const fileIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!fileIdPattern.test(fileId) || fileId.length > 100) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.INVALID_FILE_ID },
      { status: 400 },
    );
  }

  const userRole = session?.user?.role;

  if (userRole !== "ADMIN") {
    const isRestricted = await isAccessRestricted(
      fileId,
      [],
      session?.user?.email,
    );

    if (isRestricted) {
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.split(" ")[1] || accessTokenParam;

      let accessGranted = false;
      if (token) {
        try {
          const secret = new TextEncoder().encode(
            process.env.SHARE_SECRET_KEY!,
          );
          const { payload } = await jwtVerify(token, secret);
          const authorizedFolderId = payload.folderId as string;
          logger.info(
            { authorizedFolderId },
            "[Download] Token authorized for folder"
          );

          if (authorizedFolderId) {
            const stillRestricted = await isAccessRestricted(
              fileId,
              [authorizedFolderId],
              session?.user?.email,
            );
            if (!stillRestricted) {
              accessGranted = true;
            } else {
              logger.warn(
                { fileId, authorizedFolderId },
                "[Download] File is still restricted for folder token"
              );
            }
          }
        } catch (e) {
          logger.error({ err: e }, "[Download] Token verification failed");
        }
      }

      if (!accessGranted) {
        logger.warn(
          { fileId, userEmail: session?.user?.email, hasToken: !!token },
          "[Download] Access Denied"
        );
        return NextResponse.json(
          { error: ERROR_MESSAGES.ACCESS_DENIED },
          { status: 403 },
        );
      }
    }
  }

  try {
    logger.info({ fileId }, "[Download] Starting download");
    const start = Date.now();

    const accessToken = await getAccessToken();
    const t2 = Date.now();
    const fileDetails = await getFileDetailsFromDrive(fileId);

    if (fileDetails) {
      logger.info(
        { fileName: fileDetails.name, size: fileDetails.size },
        "[Download] Streaming file"
      );
    }

    if (!fileDetails) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.FILE_NOT_FOUND },
        { status: 404 },
      );
    }

    const isGoogleDoc = fileDetails.mimeType.startsWith(
      "application/vnd.google-apps.",
    );
    const isFolder = fileDetails.mimeType === MIME_TYPES.FOLDER;

    if (isFolder) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.FOLDER_DOWNLOAD_NOT_SUPPORTED },
        { status: 400 },
      );
    }

    let downloadUrl = `${GOOGLE_DRIVE_API_BASE_URL}/files/${fileId}?alt=media&supportsAllDrives=true`;
    let responseMimeType = fileDetails.mimeType;
    let responseFileName = fileDetails.name;

    const range = request.headers.get("range");
    const isVideoOrAudio =
      responseMimeType.startsWith("video/") ||
      responseMimeType.startsWith("audio/");

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${accessToken}`);
    headers.set("User-Agent", "Zee-Index-Streamer/1.0");
    headers.set("Accept-Encoding", "identity");

    if (range && !isGoogleDoc) {
      headers.set("Range", range);
    } else if (isVideoOrAudio && !isGoogleDoc && fileDetails.size) {
      const initialChunkSize = Math.min(
        2 * 1024 * 1024,
        parseInt(fileDetails.size),
      );
      headers.set("Range", `bytes=0-${initialChunkSize - 1}`);
    }

    if (isGoogleDoc) {
      const exportInfo =
        EXPORT_TYPE_MAP[
        fileDetails.mimeType as keyof typeof EXPORT_TYPE_MAP
        ] || {
          mime: "application/pdf",
          ext: ".pdf",
        };
      downloadUrl = `${GOOGLE_DRIVE_API_BASE_URL}/files/${fileId}/export?mimeType=${encodeURIComponent(exportInfo.mime)}&supportsAllDrives=true`;
      responseMimeType = exportInfo.mime;
      if (!responseFileName.endsWith(exportInfo.ext)) {
        responseFileName += exportInfo.ext;
      }
    }

    const encodedFileName = encodeURIComponent(responseFileName).replace(
      /['()]/g,
      (char) => "%" + char.charCodeAt(0).toString(16).toUpperCase(),
    );

    const isDirectDownload = !range && !request.headers.get("Sec-Fetch-Dest");
    const disposition = isDirectDownload ? "attachment" : "inline";

    if (request.method === "HEAD") {
      const headHeaders = new Headers();
      headHeaders.set("Content-Type", responseMimeType);
      headHeaders.set("Accept-Ranges", "bytes");
      if (fileDetails.size) {
        headHeaders.set("Content-Length", fileDetails.size);
      }
      headHeaders.set(
        "Content-Disposition",
        `${disposition}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
      );
      headHeaders.set(
        "Cache-Control",
        "public, max-age=31536000, no-transform, immutable",
      );
      return new Response(null, { status: 200, headers: headHeaders });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const t3 = Date.now();
    const googleResponse = await fetch(downloadUrl, {
      headers,
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    console.log(`[Download] Google Stream Ready in ${Date.now() - t3}ms`);

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

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", responseMimeType);
    responseHeaders.set(
      "Content-Disposition",
      `${disposition}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
    );

    if (isVideoOrAudio) {
      responseHeaders.set(
        "Cache-Control",
        "public, max-age=604800, no-transform",
      );
    } else {
      responseHeaders.set(
        "Cache-Control",
        "public, max-age=31536000, no-transform, immutable",
      );
    }

    responseHeaders.set("X-Accel-Buffering", "no");
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("Connection", "keep-alive");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set(
      "Access-Control-Expose-Headers",
      "Content-Range, Content-Length, Accept-Ranges",
    );

    responseHeaders.set("Transfer-Encoding", "chunked");

    const contentRange = googleResponse.headers.get("Content-Range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    const contentLength = googleResponse.headers.get("Content-Length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    responseHeaders.set("Accept-Ranges", "bytes");

    if (!range && request.method === "GET") {
      logActivity("DOWNLOAD", {
        itemName: fileDetails.name,
        itemSize: fileDetails.size || "0",
        userEmail: session?.user?.email,
      }).catch((e) => logger.error({ err: e }, "Gagal mencatat log aktivitas"));

      const downloadSize = parseInt(fileDetails.size || "0", 10);
      if (downloadSize > 0) {
        trackBandwidth(downloadSize).catch(() => { });
      }
    }

    return new Response(googleResponse.body, {
      status: googleResponse.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    logger.error({ err: error, fileId }, "Download API Error");
    const errorMessage =
      error instanceof Error ? error.message : ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
