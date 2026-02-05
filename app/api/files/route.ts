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

    if (new URL(request.url).searchParams.has("share_token") && !isShareAuth) {
      return NextResponse.json(
        { error: "Invalid share token or login required." },
        { status: 401 },
      );
    }

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

    const [isFolderProtected, hasDirectAccess] = await Promise.all([
      isProtected(folderId),
      userEmail ? hasUserAccess(userEmail, folderId) : Promise.resolve(false),
    ]);

    if (
      !session &&
      !isShareAuth &&
      isPrivateFolder(folderId) &&
      !isFolderProtected
    ) {
      return NextResponse.json(
        {
          error: "Authentication required.",
          protected: true,
          folderId: folderId,
        },
        { status: 401 },
      );
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

    const [driveResponse, allProtectedFolders] = await Promise.all([
      listFilesFromDrive(folderId, pageToken, 50, !forceRefresh),
      !canSeeAll
        ? kv
            .hgetall<Record<string, unknown>>("zee-index:protected-folders")
            .then((res) => res || {})
        : Promise.resolve({}),
    ]);

    let filteredFiles: DriveFile[];

    if (canSeeAll) {
      filteredFiles = driveResponse.files;
    } else {
      const filteringPromises = (driveResponse.files as DriveFile[]).map(
        async (file: DriveFile) => {
          const isPriv = isPrivateFolder(file.id);
          if (!isPriv) return file;

          if (userEmail) {
            const hasAccess = await hasUserAccess(userEmail, file.id);
            return hasAccess ? file : null;
          }
          return null;
        },
      );

      const results = await Promise.all(filteringPromises);
      filteredFiles = results.filter(
        (f: DriveFile | null): f is DriveFile => f !== null,
      );
    }

    const processedFiles = filteredFiles.map((file) => {
      const fileId = file.id as string;
      return {
        ...file,
        isFolder: file.mimeType === "application/vnd.google-apps.folder",
        isProtected: !canSeeAll && !!(allProtectedFolders as any)[fileId],
      };
    });

    const responseData = {
      files: processedFiles,
      nextPageToken: driveResponse.nextPageToken,
    };

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
