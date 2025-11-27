export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { listFilesFromDrive, DriveFile } from "@/lib/googleDrive";
import {
  isPrivateFolder,
  isProtected,
  verifyFolderToken,
  hasUserAccess,
} from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";

interface CachedFolderData {
  files: DriveFile[];
  nextPageToken: string | null;
}

const CACHE_TTL_SECONDS = 300;

async function validateShareToken(request: Request): Promise<boolean> {
  const { searchParams } = new URL(request.url);
  const shareToken = searchParams.get("share_token");
  if (!shareToken) return false;

  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);

    if (typeof payload.jti !== "string") {
      return false;
    }
    const isBlocked = await kv.get(`zee-index:blocked:${payload.jti}`);
    if (isBlocked) {
      console.warn(`Akses ditolak untuk token yang diblokir: ${payload.jti}`);
      return false;
    }

    if (payload.loginRequired) {
      const session = await getServerSession(authOptions);
      return !!session;
    }
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isShareAuth = await validateShareToken(request);

    if (!session && !isShareAuth) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const userRole = session?.user?.role;
    const userEmail = session?.user?.email;
    const { searchParams } = new URL(request.url);
    const folderId =
      searchParams.get("folderId") || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
    const pageToken = searchParams.get("pageToken");
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!folderId) {
      return NextResponse.json(
        { error: "Folder ID tidak ditemukan." },
        { status: 400 },
      );
    }

    const cacheKey = `folder:content:${folderId}:${
      userRole || "GUEST"
    }:${pageToken || "page1"}`;

    if (!forceRefresh) {
      try {
        const cachedDataPromise = kv.get<CachedFolderData>(cacheKey); 
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject("timeout"), 1500),
        );

        const cachedData = await Promise.race([cachedDataPromise, timeoutPromise]);

        if (cachedData && typeof cachedData === "object" && "files" in cachedData) {
          return NextResponse.json(cachedData);
        }
      } catch (e) {
        console.warn("Cache miss or KV error/timeout, fetching from Drive...", e);
      }
    }

    const canSeeAll = userRole === "ADMIN";

    const isFolderProtected = await isProtected(folderId);
    if (!canSeeAll && isFolderProtected) {
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.split(" ")[1];
      const isTokenValid = await verifyFolderToken(token || "", folderId);

      if (!isTokenValid) {
        return NextResponse.json(
          {
            error: "Authentication required for this folder.",
            protected: true,
          },
          { status: 401 },
        );
      }
    }

    const allProtectedFolders = !canSeeAll
      ? (await kv.hgetall("zee-index:protected-folders")) || {}
      : {};

    const driveResponse = await listFilesFromDrive(folderId, pageToken);
    let filteredFiles: DriveFile[];
    if (canSeeAll) {
      filteredFiles = driveResponse.files;
    } else {
      filteredFiles = [];
      for (const file of driveResponse.files) {
        const isFolder = file.mimeType === "application/vnd.google-apps.folder";
        if (!isFolder) {
          filteredFiles.push(file);
          continue;
        }

        const isPriv = isPrivateFolder(file.id);
        if (!isPriv) {
          filteredFiles.push(file);
          continue;
        }

        if (userEmail) {
          const hasAccess = await hasUserAccess(userEmail, file.id);
          if (hasAccess) {
            filteredFiles.push(file);
          }
        }
      }
    }

    const processedFiles = filteredFiles.map((file) => ({
      ...file,
      isFolder: file.mimeType === "application/vnd.google-apps.folder",
      isProtected: !canSeeAll && !!allProtectedFolders[file.id],
    }));

    const responseData = {
      files: processedFiles,
      nextPageToken: driveResponse.nextPageToken,
    };

    try {
      await kv.set(cacheKey, responseData, { ex: CACHE_TTL_SECONDS });
    } catch (e) {
      console.error("Gagal menulis cache KV:", e);
    }

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";
    console.error("[API /api/files ERROR]:", error);
    return NextResponse.json(
      {
        error: "Terjadi kesalahan internal pada server.",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
