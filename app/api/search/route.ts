import { NextResponse, NextRequest } from "next/server";
import { getAccessToken, DriveFile } from "@/lib/drive";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { validateShareToken } from "@/lib/auth";
import { isAccessRestricted } from "@/lib/securityUtils";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";
import { db } from "@/lib/db";

const CACHE_TTL = 3600;

const sanitizeString = (str: string) => str.replace(/<[^>]*>?/gm, "");
const getMimeQuery = (mimeType?: string | null) => {
  switch (mimeType) {
    case "image":
      return " and mimeType contains 'image/'";
    case "video":
      return " and mimeType contains 'video/'";
    case "audio":
      return " and mimeType contains 'audio/'";
    case "pdf":
      return " and mimeType = 'application/pdf'";
    case "folder":
      return " and mimeType = 'application/vnd.google-apps.folder'";
    default:
      return "";
  }
};

const getDateQuery = (modifiedTime?: string | null) => {
  const now = Date.now();
  let dateString = "";

  if (modifiedTime === "today") {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    dateString = today.toISOString();
  } else if (modifiedTime === "week") {
    const lastWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
    lastWeek.setHours(0, 0, 0, 0);
    dateString = lastWeek.toISOString();
  } else if (modifiedTime === "month") {
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setHours(0, 0, 0, 0);
    dateString = lastMonth.toISOString();
  }

  if (dateString) {
    return ` and modifiedTime > '${dateString}'`;
  }
  return "";
};

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  await validateShareToken(request);

  const { searchParams } = new URL(request.url);
  const rawSearchTerm = searchParams.get("q");
  const folderId = searchParams.get("folderId");
  const searchType = searchParams.get("searchType") || "name";
  const mimeType = searchParams.get("mimeType");
  const modifiedTime = searchParams.get("modifiedTime");
  const minSize = searchParams.get("minSize");

  if (!rawSearchTerm && !mimeType && !modifiedTime && !minSize) {
    return NextResponse.json(
      { error: "Search criteria is required." },
      { status: 400 },
    );
  }

  const sanitizedSearchTerm = rawSearchTerm
    ? sanitizeString(rawSearchTerm)
    : "";
  const searchTerm = sanitizedSearchTerm.replace(/'/g, "''");

  const cacheKey = `search:${JSON.stringify({
    q: searchTerm,
    folderId,
    searchType,
    mimeType,
    modifiedTime,
    minSize,
    isAdmin: session?.user?.role === "ADMIN",
  })}`;

  let cachedData = null;
  try {
    cachedData = await kv.get(cacheKey);
  } catch {}

  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  try {
    const accessToken = await getAccessToken();
    const driveUrl = "https://www.googleapis.com/drive/v3/files";
    const queryField = searchType === "fullText" ? "fullText" : "name";

    let driveQuery = "trashed=false";
    if (searchTerm) {
      driveQuery += ` and ${queryField} contains '${searchTerm}'`;
    }

    const fileIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (folderId) {
      if (!fileIdPattern.test(folderId) || folderId.length > 100) {
        return NextResponse.json(
          { error: "Invalid folderId format." },
          { status: 400 },
        );
      }
      driveQuery += ` and '${folderId}' in parents`;
    }

    driveQuery += getMimeQuery(mimeType);
    driveQuery += getDateQuery(modifiedTime);
    if (minSize) {
      const bytes = parseInt(minSize) * 1024 * 1024;
      driveQuery += ` and size > ${bytes}`;
    }

    const params = new URLSearchParams({
      q: driveQuery,
      fields:
        "files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, thumbnailLink, hasThumbnail, parents)",
      pageSize: "100",
    });
    const response = await fetch(`${driveUrl}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Drive API Error: ${errorData.error.message}`);
    }

    const data = await response.json();

    const isAdmin = session?.user?.role === "ADMIN";
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];
    const allowedTokens: string[] = [];

    if (token) {
      try {
        const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
        const { payload } = await jwtVerify(token, secret);
        if (payload.folderId) {
          allowedTokens.push(payload.folderId as string);
        }
      } catch {}
    }

    const [allProtectedFolders, isPrivFolder] = await Promise.all([
      db.protectedFolder
        .findMany({ select: { folderId: true } })
        .then((res: { folderId: string }[]) => {
          const map: Record<string, boolean> = {};
          res.forEach((r: { folderId: string }) => (map[r.folderId] = true));
          return map;
        }),
      import("@/lib/auth").then((m) => m.isPrivateFolder),
    ]);

    const processedFiles = (data.files || []).map((file: DriveFile) => {
      const isFolder = file.mimeType === "application/vnd.google-apps.folder";
      const fileId = file.id as string;
      const isProt = !!(allProtectedFolders as any)[fileId];
      const isPriv = isPrivFolder(fileId);

      return {
        ...file,
        isFolder,
        isProtected: isProt || isPriv,
      };
    });

    const filteredFiles = await Promise.all(
      processedFiles.map(async (file: any) => {
        if (isAdmin) return file;
        const restricted = await isAccessRestricted(
          file.id,
          allowedTokens,
          session?.user?.email,
        );
        return restricted ? null : file;
      }),
    );

    const result = {
      files: filteredFiles.filter((f) => f !== null),
      nextPageToken: data.nextPageToken,
    };

    try {
      await kv.set(cacheKey, result, { ex: CACHE_TTL });
    } catch {}

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";
    return NextResponse.json(
      { error: "Failed to perform search.", details: errorMessage },
      { status: 500 },
    );
  }
}
