import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { listFilesFromDrive, DriveFile } from "@/lib/drive";
import { isPrivateFolder } from "@/lib/auth";
import { isAccessRestricted } from "@/lib/securityUtils";
import { getProtectedFolderIdsCached } from "@/lib/securityUtils";
import { validateShareToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
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

    const [driveResponse, protectedFolderIds] = await Promise.all([
      listFilesFromDrive(folderId, pageToken, 50, !forceRefresh),
      getProtectedFolderIdsCached(),
    ]);

    const protectedFolderMap: Record<string, boolean> = {};
    protectedFolderIds.forEach((id) => {
      protectedFolderMap[id] = true;
    });

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
        const isProt = !!protectedFolderMap[file.id];

        if (!isPriv) return true;

        if (accessMap[file.id]) return true;

        if (isProt) return true;

        return false;
      });
    }

    const processedFiles = filteredFiles.map((file) => {
      const fileId = file.id as string;
      const isProt = !!protectedFolderMap[fileId];
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
