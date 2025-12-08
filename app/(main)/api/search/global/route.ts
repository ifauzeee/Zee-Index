import { NextResponse, NextRequest } from "next/server";
import {
  getAccessToken,
  DriveFile,
  getAllDescendantFolders,
  searchFilesInFolder,
} from "@/lib/googleDrive";
import { isProtected } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { validateShareToken } from "@/lib/auth";
import { isAccessRestricted } from "@/lib/securityUtils";
import { jwtVerify } from "jose";

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
  const now = new Date();
  let dateString = "";

  if (modifiedTime === "today") {
    dateString = new Date(now.setHours(0, 0, 0, 0)).toISOString();
  } else if (modifiedTime === "week") {
    const lastWeek = new Date(now.setDate(now.getDate() - 7));
    dateString = new Date(lastWeek.setHours(0, 0, 0, 0)).toISOString();
  } else if (modifiedTime === "month") {
    const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
    dateString = new Date(lastMonth.setHours(0, 0, 0, 0)).toISOString();
  }

  if (dateString) {
    return ` and modifiedTime > '${dateString}'`;
  }
  return "";
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const isShareAuth = await validateShareToken(request);

  if (!session && !isShareAuth) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawSearchTerm = searchParams.get("q");
  const searchType = searchParams.get("searchType") || "name";
  const mimeType = searchParams.get("mimeType");
  const modifiedTime = searchParams.get("modifiedTime");
  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;

  if (!rawSearchTerm) {
    return NextResponse.json(
      { error: "Search term is required." },
      { status: 400 },
    );
  }
  if (!rootFolderId) {
    return NextResponse.json(
      { error: "Root folder ID is not configured." },
      { status: 500 },
    );
  }

  const sanitizedSearchTerm = sanitizeString(rawSearchTerm);
  const searchTerm = sanitizedSearchTerm.replace(/'/g, "''");

  try {
    const accessToken = await getAccessToken();
    const descendantFolderIds = await getAllDescendantFolders(
      accessToken,
      rootFolderId,
    );
    const queryField = searchType === "fullText" ? "fullText" : "name";
    const mimeQuery = getMimeQuery(mimeType);
    const dateQuery = getDateQuery(modifiedTime);

    const searchPromises = descendantFolderIds.map((folderId) =>
      searchFilesInFolder(
        accessToken,
        folderId,
        searchTerm,
        queryField,
        mimeQuery,
        dateQuery,
      ),
    );
    const results = await Promise.allSettled(searchPromises);

    const allFiles: DriveFile[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        allFiles.push(...result.value);
      } else if (result.status === "rejected") {
        console.error("Sebagian pencarian global gagal:", result.reason);
      }
    }

    const uniqueFiles = new Map<string, DriveFile>();
    for (const file of allFiles) {
      if (!uniqueFiles.has(file.id)) {
        uniqueFiles.set(file.id, file);
      }
    }

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

    const processedFilesPromise = Array.from(uniqueFiles.values()).map(
      async (file: DriveFile) => {
        const isFolder = file.mimeType === "application/vnd.google-apps.folder";
        const protectedFolder = isFolder ? await isProtected(file.id) : false;

        return {
          ...file,
          isFolder,
          isProtected: protectedFolder,
        };
      },
    );

    const processedFiles = await Promise.all(processedFilesPromise);

    const filteredFiles = await Promise.all(
      processedFiles.map(async (file) => {
        if (isAdmin) return file;
        const restricted = await isAccessRestricted(file.id, allowedTokens);
        return restricted ? null : file;
      }),
    );

    return NextResponse.json({ files: filteredFiles.filter((f) => f !== null) });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";
    console.error("Global Search API Error:", errorMessage);
    return NextResponse.json(
      { error: "Failed to perform global search.", details: errorMessage },
      { status: 500 },
    );
  }
}
