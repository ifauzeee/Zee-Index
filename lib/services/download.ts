import { type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { checkRateLimit } from "@/lib/ratelimit";
import { isAccessRestricted } from "@/lib/securityUtils";
import { logger } from "@/lib/logger";
import {
  EXPORT_TYPE_MAP,
  REDIS_KEYS,
  ERROR_MESSAGES,
  GOOGLE_DRIVE_API_BASE_URL,
} from "@/lib/constants";

export interface DownloadContext {
  fileId: string;
  shareToken: string | null;
  accessTokenParam: string | null;
  range: string | null;
}

export type DownloadErrorType = {
  error: string;
  status: number;
};

export async function validateDownloadRequest(request: NextRequest): Promise<{
  context: DownloadContext;
  session: any;
  error?: DownloadErrorType;
}> {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");
  const shareToken = searchParams.get("share_token");
  const accessTokenParam = searchParams.get("access_token");
  const range = request.headers.get("range");

  if (!range) {
    const { success } = await checkRateLimit(request, "DOWNLOAD");
    if (!success) {
      return {
        context: {} as any,
        session: null,
        error: { error: ERROR_MESSAGES.DOWNLOAD_LIMIT_EXCEEDED, status: 429 },
      };
    }
  }

  const session = await getServerSession(authOptions);

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
    } catch (err: any) {
      return {
        context: {} as any,
        session,
        error: {
          error: err.message || ERROR_MESSAGES.INVALID_SHARE_TOKEN,
          status: 401,
        },
      };
    }
  }

  if (!fileId) {
    return {
      context: {} as any,
      session,
      error: { error: ERROR_MESSAGES.MISSING_FILE_ID, status: 400 },
    };
  }

  const fileIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!fileIdPattern.test(fileId) || fileId.length > 100) {
    return {
      context: {} as any,
      session,
      error: { error: ERROR_MESSAGES.INVALID_FILE_ID, status: 400 },
    };
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

          if (authorizedFolderId) {
            const stillRestricted = await isAccessRestricted(
              fileId,
              [authorizedFolderId],
              session?.user?.email,
            );
            if (!stillRestricted) {
              accessGranted = true;
            }
          }
        } catch (e) {
          logger.error(
            { err: e },
            "[Download Service] Token verification failed",
          );
        }
      }

      if (!accessGranted) {
        return {
          context: {} as any,
          session,
          error: { error: ERROR_MESSAGES.ACCESS_DENIED, status: 403 },
        };
      }
    }
  }

  return {
    context: {
      fileId,
      shareToken,
      accessTokenParam,
      range,
    },
    session,
  };
}

export function prepareGoogleDriveUrl(
  fileId: string,
  fileDetails: any,
): { url: string; mimeType: string; filename: string } {
  let downloadUrl = `${GOOGLE_DRIVE_API_BASE_URL}/files/${fileId}?alt=media&supportsAllDrives=true`;
  let responseMimeType = fileDetails.mimeType;
  let responseFileName = fileDetails.name;

  const isGoogleDoc = fileDetails.mimeType.startsWith(
    "application/vnd.google-apps.",
  );

  if (isGoogleDoc) {
    const exportInfo = EXPORT_TYPE_MAP[
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

  return {
    url: downloadUrl,
    mimeType: responseMimeType,
    filename: responseFileName,
  };
}

export function prepareResponseHeaders(
  mimeType: string,
  filename: string,
  range: string | null,
  secFetchDest: string | null,
  googleResponse: Response,
  isHEAD: boolean = false,
): Headers {
  const responseHeaders = new Headers();
  const encodedFileName = encodeURIComponent(filename).replace(
    /['()]/g,
    (char) => "%" + char.charCodeAt(0).toString(16).toUpperCase(),
  );

  const isDirectDownload = !range && !secFetchDest;
  const disposition = isDirectDownload ? "attachment" : "inline";

  responseHeaders.set("Content-Type", mimeType);
  responseHeaders.set(
    "Content-Disposition",
    `${disposition}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
  );

  const isVideoOrAudio =
    mimeType.startsWith("video/") || mimeType.startsWith("audio/");
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

  if (isHEAD) return responseHeaders;

  responseHeaders.set("Transfer-Encoding", "chunked");

  const contentRange = googleResponse.headers.get("Content-Range");
  if (contentRange) responseHeaders.set("Content-Range", contentRange);

  const contentLength = googleResponse.headers.get("Content-Length");
  if (contentLength) responseHeaders.set("Content-Length", contentLength);

  responseHeaders.set("Accept-Ranges", "bytes");

  return responseHeaders;
}
