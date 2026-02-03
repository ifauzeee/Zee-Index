import { NextResponse, type NextRequest } from "next/server";
import { getAccessToken, getFileDetailsFromDrive } from "@/lib/drive";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { logActivity } from "@/lib/activityLogger";
import { checkRateLimit } from "@/lib/ratelimit";
import { isAccessRestricted } from "@/lib/securityUtils";

export async function HEAD(request: NextRequest) {
  return GET(request);
}

export async function GET(request: NextRequest) {
  const { success } = await checkRateLimit(request, "download");
  if (!success) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan unduhan. Silakan tunggu sebentar." },
      { status: 429 },
    );
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
        const isBlocked = await kv.get(`zee-index:blocked:${payload.jti}`);
        if (isBlocked) throw new Error("Tautan ini telah dibatalkan.");

        if (payload.loginRequired && !session) {
          throw new Error("Login required.");
        }
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid share token or authentication required." },
        { status: 401 },
      );
    }
  }

  if (!fileId) {
    return NextResponse.json(
      { error: "Parameter fileId tidak ditemukan." },
      { status: 400 },
    );
  }

  const fileIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!fileIdPattern.test(fileId) || fileId.length > 100) {
    return NextResponse.json(
      { error: "Format fileId tidak valid." },
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
          const folderId = payload.folderId as string;
          if (folderId) {
            const stillRestricted = await isAccessRestricted(
              fileId,
              [folderId],
              session?.user?.email,
            );
            if (!stillRestricted) {
              accessGranted = true;
            }
          }
        } catch (e) {
          console.error("Token verification failed:", e);
        }
      }

      if (!accessGranted) {
        return NextResponse.json(
          { error: "Access Denied: File is protected." },
          { status: 403 },
        );
      }
    }
  }

  try {
    const accessToken = await getAccessToken();
    const fileDetails = await getFileDetailsFromDrive(fileId);

    if (!fileDetails) {
      return NextResponse.json(
        { error: "File tidak ditemukan di Google Drive." },
        { status: 404 },
      );
    }

    const isGoogleDoc = fileDetails.mimeType.startsWith(
      "application/vnd.google-apps.",
    );
    const isFolder =
      fileDetails.mimeType === "application/vnd.google-apps.folder";

    if (isFolder) {
      return NextResponse.json(
        { error: "Tidak dapat mengunduh folder secara langsung." },
        { status: 400 },
      );
    }

    const range = request.headers.get("range");
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${accessToken}`);
    headers.set("User-Agent", "Zee-Index-Streamer/1.0");
    headers.set("Accept-Encoding", "identity");

    if (range && !isGoogleDoc) {
      headers.set("Range", range);
    }

    let downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
    let responseMimeType = fileDetails.mimeType;
    let responseFileName = fileDetails.name;

    if (isGoogleDoc) {
      const exportTypeMap: Record<string, { mime: string; ext: string }> = {
        "application/vnd.google-apps.document": {
          mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ext: ".docx",
        },
        "application/vnd.google-apps.spreadsheet": {
          mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ext: ".xlsx",
        },
        "application/vnd.google-apps.presentation": {
          mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          ext: ".pptx",
        },
        "application/vnd.google-apps.drawing": {
          mime: "image/png",
          ext: ".png",
        },
        "application/vnd.google-apps.script": {
          mime: "application/vnd.google-apps.script+json",
          ext: ".json",
        },
      };

      const exportInfo = exportTypeMap[fileDetails.mimeType] || {
        mime: "application/pdf",
        ext: ".pdf",
      };
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportInfo.mime)}&supportsAllDrives=true`;
      responseMimeType = exportInfo.mime;
      if (!responseFileName.endsWith(exportInfo.ext)) {
        responseFileName += exportInfo.ext;
      }
    }

    const googleResponse = await fetch(downloadUrl, {
      headers,
      method: request.method,
    });

    if (!googleResponse.ok) {
      const errorJson = await googleResponse.json().catch(() => ({}));
      console.error("Google Drive API Error:", errorJson);
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

    const encodedFileName = encodeURIComponent(responseFileName).replace(
      /['()]/g,
      (char) => "%" + char.charCodeAt(0).toString(16).toUpperCase(),
    );

    const isDirectDownload = !range && !request.headers.get("Sec-Fetch-Dest");
    const disposition = isDirectDownload ? "attachment" : "inline";

    responseHeaders.set(
      "Content-Disposition",
      `${disposition}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
    );

    responseHeaders.set("Cache-Control", "private, no-transform, max-age=3600");
    responseHeaders.set("X-Accel-Buffering", "no");

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
      }).catch((e) => console.error("Gagal mencatat log aktivitas:", e));
    }

    return new Response(
      request.method === "HEAD" ? null : googleResponse.body,
      {
        status: googleResponse.status,
        headers: responseHeaders,
      },
    );
  } catch (error: any) {
    console.error("Download API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error." },
      { status: 500 },
    );
  }
}
