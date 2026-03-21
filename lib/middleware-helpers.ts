import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { checkAuth, handleAuthRedirect } from "@/lib/auth-check";
import { getRootFolderId } from "@/lib/config";

export async function validateShareToken(
  request: NextRequest,
  shareToken: string,
  pathname: string,
  isApi: boolean,
  intlMiddleware: any,
) {
  try {
    const shareSecretKey = process.env.SHARE_SECRET_KEY;
    if (!shareSecretKey || shareSecretKey.length < 32) {
      return handleAuthRedirect(request, pathname);
    }

    const secret = new TextEncoder().encode(shareSecretKey);
    const { payload } = await jwtVerify(shareToken, secret);

    if (payload.loginRequired) {
      const { isAuthenticated } = await checkAuth(
        request,
        process.env.NEXTAUTH_SECRET,
      );
      if (!isAuthenticated) {
        return handleAuthRedirect(request, pathname, "GuestAccessDenied");
      }
    }

    return isApi ? NextResponse.next() : intlMiddleware(request);
  } catch {
    if (isApi) {
      return NextResponse.json({ error: "ShareLinkExpired" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.searchParams.delete("share_token");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "ShareLinkExpired");
    loginUrl.searchParams.set("callbackUrl", url.toString());
    return NextResponse.redirect(loginUrl);
  }
}

export async function validateFolderToken(
  request: NextRequest,
  currentFolderId: string,
  isApi: boolean,
  intlMiddleware: any,
) {
  const folderToken = request.cookies.get(
    `folder_token_${currentFolderId}`,
  )?.value;
  if (!folderToken) return null;

  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(folderToken, secret);

    if (payload.folderId === currentFolderId) {
      const response = isApi ? NextResponse.next() : intlMiddleware(request);
      response.headers.set("x-folder-authorized", "true");
      return response;
    }
  } catch (error) {
    console.error("Folder token validation failed:", error);
  }
  return null;
}

export async function handleFindPath(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("id");
  if (!fileId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const { getAccessToken } = await import("@/lib/drive/auth");
    const { fetchMetadata } = await import("@/lib/drive/fetchers");

    const accessToken = await getAccessToken();
    let file = await fetchMetadata(fileId, accessToken);

    if (!file || file.trashed) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (
      file.mimeType === "application/vnd.google-apps.shortcut" &&
      file.shortcutDetails?.targetId
    ) {
      const targetToken = await getAccessToken();
      const targetFile = await fetchMetadata(
        file.shortcutDetails.targetId,
        targetToken,
      );
      if (targetFile) file = targetFile;
    }

    let destinationPath = "";
    if (file.mimeType === "application/vnd.google-apps.folder") {
      destinationPath = `/folder/${file.id}`;
    } else {
      const rootFolderId = (await getRootFolderId()) || "root";
      const parentId =
        file.parents && file.parents.length > 0
          ? file.parents[0]
          : rootFolderId;
      const slug = encodeURIComponent(
        (file.name || "view").replace(/\s+/g, "-").toLowerCase(),
      );
      destinationPath = `/folder/${parentId}/file/${file.id}/${slug}`;
    }

    const destinationUrl = new URL(destinationPath, request.url);
    if (request.nextUrl.searchParams.get("view") === "true") {
      destinationUrl.searchParams.set("view", "true");
    }
    return NextResponse.redirect(destinationUrl);
  } catch (error) {
    console.error("Middleware findpath error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
