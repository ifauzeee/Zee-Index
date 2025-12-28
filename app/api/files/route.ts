export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { listFilesFromDrive, DriveFile } from "@/lib/drive";
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

const CACHE_TTL_SECONDS = 3600;

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

    const { searchParams } = new URL(request.url);
    const rawFolderId =
      searchParams.get("folderId") || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;

    let folderId = "";
    if (rawFolderId) {
      folderId = decodeURIComponent(rawFolderId)
        .split("&")[0]
        .split("?")[0]
        .trim();
    }

    const userRole = session?.user?.role;
    const userEmail = session?.user?.email;

    const pageToken = searchParams.get("pageToken");
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!folderId || folderId === "undefined") {
      return NextResponse.json(
        { error: "Folder ID tidak ditemukan." },
        { status: 400 },
      );
    }

    const canSeeAll = userRole === "ADMIN";
    const isFolderProtected = await isProtected(folderId);

    if (
      !session &&
      !isShareAuth &&
      isPrivateFolder(folderId) &&
      !isFolderProtected
    ) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    let hasDirectAccess = false;
    if (userEmail) {
      hasDirectAccess = await hasUserAccess(userEmail, folderId);
    }

    if (!canSeeAll && isFolderProtected && !hasDirectAccess) {
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

    const cacheKey = `folder:content:${folderId}:${
      userRole || "GUEST"
    }:${pageToken || "page1"}`;

    if (!forceRefresh) {
      try {
        const cachedDataPromise = kv.get<CachedFolderData>(cacheKey);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject("timeout"), 1500),
        );

        const cachedData = await Promise.race([
          cachedDataPromise,
          timeoutPromise,
        ]);

        if (
          cachedData &&
          typeof cachedData === "object" &&
          "files" in cachedData
        ) {
          return NextResponse.json(cachedData);
        }
      } catch {}
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
        const isPriv = isPrivateFolder(file.id);
        if (isPriv) {
          if (userEmail) {
            const hasAccess = await hasUserAccess(userEmail, file.id);
            if (hasAccess) filteredFiles.push(file);
          }
          continue;
        }

        filteredFiles.push(file);
      }
    }

    const processedFiles = filteredFiles.map((file) => {
      return {
        ...file,
        isFolder: file.mimeType === "application/vnd.google-apps.folder",
        isProtected: !canSeeAll && !!allProtectedFolders[file.id],
      };
    });

    const responseData = {
      files: processedFiles,
      nextPageToken: driveResponse.nextPageToken,
    };

    try {
      await kv.set(cacheKey, responseData, { ex: CACHE_TTL_SECONDS });
    } catch (e) {
      console.error(e);
    }

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";

    if (!(error as any).isProtected) {
      console.error(error);
    }

    return NextResponse.json(
      {
        error: "Terjadi kesalahan internal pada server.",
        details: errorMessage,
        protected: (error as any).isProtected || false,
        folderId: (error as any).folderId,
      },
      { status: (error as any).isProtected ? 401 : 500 },
    );
  }
}
