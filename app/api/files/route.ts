import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { listAllFiles } from "@/lib/storage";
import { ZeeFile } from "@/types/storage";
import { isPrivateFolder } from "@/lib/auth";
import { isAccessRestricted } from "@/lib/securityUtils";
import { getProtectedFolderIdsCached } from "@/lib/securityUtils";
import { validateShareToken } from "@/lib/auth";
import { RequestError, getErrorMessage } from "@/lib/errors";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async ({ request, session }) => {
    try {
      const isShareAuth = await validateShareToken(request);

      if (
        new URL(request.url).searchParams.has("share_token") &&
        !isShareAuth
      ) {
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

      const isLocalStorage = folderId.startsWith("local-storage:");
      if (!canSeeAll && isRestricted) {
        if (isLocalStorage) {
          const { checkLocalStorageAccess } = await import("@/lib/auth");
          const hasLocalAccess = await checkLocalStorageAccess(request);

          if (!hasLocalAccess) {
            return NextResponse.json(
              {
                error: "Autentikasi Local Storage diperlukan",
                isLocalAuthNeeded: true,
              },
              { status: 401 },
            );
          }
        } else {
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
              logger.error({ err: e }, "[Files API] Token verification failed");
            }
          }

          if (!accessGranted && !folderId.startsWith("local-storage:")) {
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
      }

      const [driveResponse, protectedFolderIds] = await Promise.all([
        listAllFiles({
          folderId,
          pageToken: pageToken || undefined,
          pageSize: 50,
          useCache: !forceRefresh,
        }),
        getProtectedFolderIdsCached(),
      ]);

      const protectedFolderMap: Record<string, boolean> = {};
      protectedFolderIds.forEach((id) => {
        protectedFolderMap[id] = true;
      });

      let filteredFiles: ZeeFile[];

      if (canSeeAll) {
        filteredFiles = driveResponse.files;
      } else {
        const privateFoldersToCheck = driveResponse.files.filter((f: ZeeFile) =>
          isPrivateFolder(f.id),
        );
        const accessMap =
          userEmail && privateFoldersToCheck.length > 0
            ? await import("@/lib/auth").then((m) =>
                m.hasUserAccessBatch(
                  userEmail,
                  privateFoldersToCheck.map((f: ZeeFile) => f.id),
                ),
              )
            : {};

        filteredFiles = driveResponse.files.filter((file: ZeeFile) => {
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
          isProtected: (isProt || isPriv) && !canSeeAll,
        };
      });

      const responseData = {
        files: processedFiles,
        nextPageToken: driveResponse.nextPageToken,
      };

      import("@/lib/activityLogger").then((m) => {
        m.logActivity("SHARE_LINK_ACCESSED", {
          itemName: "Folder View",
          itemId: folderId,
          userEmail: session?.user?.email || "Guest",
          status: "success",
        });
      });

      return NextResponse.json(responseData);
    } catch (error: unknown) {
      const requestError =
        error instanceof RequestError
          ? error
          : new RequestError(getErrorMessage(error), {
              cause: error,
            });

      if (!requestError.isProtected) {
        logger.error({ err: error });
      }

      return NextResponse.json(
        {
          error: requestError.message,
          protected: requestError.isProtected,
          folderId: requestError.folderId,
        },
        {
          status: requestError.status || (requestError.isProtected ? 401 : 500),
        },
      );
    }
  },
  { includeSession: true, rateLimit: false },
);
