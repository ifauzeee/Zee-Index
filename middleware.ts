import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import createMiddleware from "next-intl/middleware";
import { checkAuth, handleAuthRedirect } from "@/lib/auth-check";

const intlMiddleware = createMiddleware({
  locales: ["en", "id"],
  defaultLocale: "en",
  localePrefix: "always",
});

const PUBLIC_PATHS = new Set(["/login", "/verify-2fa", "/setup", "/request"]);
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/config/public",
  "/api/setup",
  "/api/files",
  "/api/folderpath",
  "/api/tags",
  "/api/download",
  "/api/proxy-image",
  "/api/admin/config",
  "/api/admin/manual-drives",
  "/api/admin/analytics/track",
  "/api/health",
];

const isPublicRoute = (pathname: string) => {
  return (
    PUBLIC_PATHS.has(pathname) ||
    ["/folder", "/share", "/request", "/login"].some((p) =>
      pathname.startsWith(p),
    )
  );
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/download")
  ) {
    return NextResponse.next();
  }

  const pathnameWithoutLocale = pathname.replace(/^\/(en|id)/, "") || "/";
  const isApi = pathname.startsWith("/api");
  const isConfigured = !!process.env.GOOGLE_REFRESH_TOKEN;

  if (!isConfigured) {
    const isSetupPage =
      pathnameWithoutLocale.startsWith("/setup") ||
      pathnameWithoutLocale.startsWith("/api/setup");

    if (isSetupPage) {
      return isApi ? NextResponse.next() : intlMiddleware(request);
    }
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  if (isConfigured && pathnameWithoutLocale.startsWith("/setup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    PUBLIC_PATHS.has(pathnameWithoutLocale) ||
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return isApi ? NextResponse.next() : intlMiddleware(request);
  }

  const shareToken = request.nextUrl.searchParams.get("share_token");
  if (shareToken) {
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
        return NextResponse.json(
          { error: "ShareLinkExpired" },
          { status: 401 },
        );
      }
      const url = request.nextUrl.clone();
      url.searchParams.delete("share_token");
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "ShareLinkExpired");
      loginUrl.searchParams.set("callbackUrl", url.toString());
      return NextResponse.redirect(loginUrl);
    }
  }

  const { isAuthenticated, isGuest, is2FARequired } = await checkAuth(
    request,
    process.env.NEXTAUTH_SECRET,
  );

  if (!isAuthenticated && !isPublicRoute(pathnameWithoutLocale)) {
    return handleAuthRedirect(request, pathname);
  }

  if (
    isAuthenticated &&
    isGuest &&
    pathnameWithoutLocale.startsWith("/admin")
  ) {
    return handleAuthRedirect(request, pathname, "GuestAccessDenied");
  }

  const is2FAPage = pathnameWithoutLocale === "/verify-2fa";
  if (isAuthenticated && is2FARequired && !is2FAPage) {
    const verifyUrl = new URL("/verify-2fa", request.url);
    verifyUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(verifyUrl);
  }

  let currentFolderId = "";
  if (pathnameWithoutLocale.startsWith("/folder/")) {
    currentFolderId = pathnameWithoutLocale.split("/")[2];
  } else if (pathname.startsWith("/api/files")) {
    currentFolderId = request.nextUrl.searchParams.get("folderId") || "";
  }

  if (currentFolderId) {
    const folderToken = request.cookies.get(
      `folder_token_${currentFolderId}`,
    )?.value;
    if (folderToken) {
      try {
        const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
        const { payload } = await jwtVerify(folderToken, secret);

        if (payload.folderId === currentFolderId) {
          const response = isApi
            ? NextResponse.next()
            : intlMiddleware(request);
          response.headers.set("x-folder-authorized", "true");
          return response;
        }
      } catch { }
    }
  }

  if (!isAuthenticated && !isPublicRoute(pathnameWithoutLocale)) {
    return handleAuthRedirect(request, pathname);
  }

  if (pathname.startsWith("/findpath")) {
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
        const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID || "root";
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

  return isApi ? NextResponse.next() : intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};
