import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { checkAuth, handleAuthRedirect } from "@/lib/auth-check";
import {
  checkRateLimit,
  createRateLimitResponse,
  type RateLimitType,
} from "@/lib/ratelimit";
import { ERROR_MESSAGES } from "@/lib/constants";
import { isAppConfigured } from "@/lib/config";
import {
  validateShareToken,
  validateFolderToken,
  handleFindPath,
} from "@/lib/middleware-helpers";
import {
  DEFAULT_LOCALE,
  LOCALES,
  stripLocaleFromPathname,
} from "@/lib/i18n-config";

const intlMiddleware = createMiddleware({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
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
  "/api/admin/analytics/track",
  "/api/health",
  "/api/metadata",
];

const isPublicRoute = (pathname: string) => {
  return (
    PUBLIC_PATHS.has(pathname) ||
    ["/folder", "/share", "/request", "/login"].some((p) =>
      pathname.startsWith(p),
    )
  );
};

export async function proxy(request: NextRequest) {
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

  const pathnameWithoutLocale = stripLocaleFromPathname(pathname) || "/";
  const isApi = pathnameWithoutLocale.startsWith("/api");

  if (isApi && !pathnameWithoutLocale.startsWith("/api/health")) {
    const type: RateLimitType = pathnameWithoutLocale.startsWith("/api/admin")
      ? "ADMIN"
      : "API";

    const ratelimitResult = await checkRateLimit(request, type);
    if (!ratelimitResult.success) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED },
        {
          status: 429,
          headers: createRateLimitResponse(ratelimitResult).headers,
        },
      );
    }
  }

  const isConfigured = await isAppConfigured();

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
  }

  if (
    PUBLIC_PATHS.has(pathnameWithoutLocale) ||
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return isApi ? NextResponse.next() : intlMiddleware(request);
  }

  const shareToken = request.nextUrl.searchParams.get("share_token");
  if (shareToken) {
    return validateShareToken(
      request,
      shareToken,
      pathname,
      isApi,
      intlMiddleware,
    );
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
    const folderRes = await validateFolderToken(
      request,
      currentFolderId,
      isApi,
      intlMiddleware,
    );
    if (folderRes) return folderRes;
  }

  if (!isAuthenticated && !isPublicRoute(pathnameWithoutLocale)) {
    return handleAuthRedirect(request, pathname);
  }

  if (pathname.startsWith("/findpath")) {
    return handleFindPath(request);
  }

  return isApi ? NextResponse.next() : intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};
