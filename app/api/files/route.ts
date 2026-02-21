export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { listFilesFromDrive, DriveFile } from "@/lib/drive";
import { isPrivateFolder } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";
import { db } from "@/lib/db";
import { isAccessRestricted } from "@/lib/securityUtils";

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

    const isRestricted = await isAccessRestricted(folderId, [], userEmail);

    if (!canSeeAll && isRestricted) {
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.split(" ")[1];

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
              folderId,
              [authorizedFolderId],
              userEmail,
            );
            if (!stillRestricted) {
              accessGranted = true;
            }
          }
        } catch (e) {
          console.error("[Files API] Token verification failed:", e);
        }
      }

      if (!accessGranted) {
        return NextResponse.json(
          {
            error: "Authentication required for this folder.",
            protected: true,
            folderId: folderId,
          },
          { status: 401 },
        );
      }
    }

    const [driveResponse, allProtectedFolders] = await Promise.all([
      listFilesFromDrive(folderId, pageToken, 50, !forceRefresh),
      db.protectedFolder
        .findMany({ select: { folderId: true } })
        .then((res: { folderId: string }[]) => {
          const map: Record<string, boolean> = {};
          res.forEach((r: { folderId: string }) => (map[r.folderId] = true));
          return map;
        }),
    ]);

    let filteredFiles: DriveFile[];

    if (canSeeAll) {
      filteredFiles = driveResponse.files;
    } else {
      const privateFoldersToCheck = driveResponse.files.filter((f: DriveFile) =>
        isPrivateFolder(f.id),
      );
      const accessMap =
        userEmail && privateFoldersToCheck.length > 0
          ? await import("@/lib/auth").then((m) =>
              m.hasUserAccessBatch(
                userEmail,
                privateFoldersToCheck.map((f: DriveFile) => f.id),
              ),
            )
          : {};

      filteredFiles = driveResponse.files.filter((file: DriveFile) => {
        const isPriv = isPrivateFolder(file.id);
        const isProt = !!(allProtectedFolders as any)[file.id];

        if (!isPriv) return true;

        if (accessMap[file.id]) return true;

        if (isProt) return true;

        return false;
      });
    }

    const processedFiles = filteredFiles.map((file) => {
      const fileId = file.id as string;
      const isProt = !!(allProtectedFolders as any)[fileId];
      const isPriv = isPrivateFolder(fileId);

      return {
        ...file,
        isFolder: file.mimeType === "application/vnd.google-apps.folder",
        isProtected: !canSeeAll && (isProt || isPriv),
      };
    });

    const responseData = {
      files: processedFiles,
      nextPageToken: driveResponse.nextPageToken,
    };

    import("@/lib/activityLogger").then((m) => {
      m.logActivity("SHARE_LINK_ACCESSED" as any, {
        itemName: "Folder View",
        itemId: folderId,
        userEmail: session?.user?.email || "Guest",
        status: "success",
      });
    });

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
