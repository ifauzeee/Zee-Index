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
  validateDownloadTokenSignature,
} from "@/lib/middleware-helpers";

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

function createNonce(): string {
  return btoa(crypto.randomUUID());
}

function createContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://cdn.jsdelivr.net https://www.google-analytics.com`,
    `script-src-elem 'self' 'nonce-${nonce}' 'unsafe-eval' https://cdn.jsdelivr.net https://www.google-analytics.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.googleusercontent.com https://drive.google.com https://images.unsplash.com https://image.tmdb.org",
    "media-src 'self' blob: https://*.googleapis.com",
    "connect-src 'self' https://*.googleapis.com https://*.google.com https://cdn.jsdelivr.net https://www.google-analytics.com",
    "frame-src 'self' https://accounts.google.com",
    "worker-src 'self' blob: https://cdn.jsdelivr.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function mergeMiddlewareRequestHeaders(
  response: Response,
  requestOverride: NextResponse,
) {
  const existingOverrideHeaders = response.headers
    .get("x-middleware-override-headers")
    ?.split(",")
    .map((header) => header.trim())
    .filter(Boolean);
  const overrideHeaders = requestOverride.headers
    .get("x-middleware-override-headers")
    ?.split(",")
    .map((header) => header.trim())
    .filter(Boolean);

  if (overrideHeaders?.length) {
    response.headers.set(
      "x-middleware-override-headers",
      Array.from(
        new Set([...(existingOverrideHeaders || []), ...overrideHeaders]),
      ).join(","),
    );
  }

  requestOverride.headers.forEach((value, key) => {
    if (key.startsWith("x-middleware-request-")) {
      response.headers.set(key, value);
    }
  });
}

function applyCsp(request: NextRequest, response: Response): Response {
  const nonce = createNonce();
  const contentSecurityPolicy = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const requestOverride = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  mergeMiddlewareRequestHeaders(response, requestOverride);

  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  response.headers.set("x-nonce", nonce);
  return response;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/api/health")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/download")) {
    const signatureError = await validateDownloadTokenSignature(request);
    if (signatureError) {
      return applyCsp(request, signatureError);
    }
    return applyCsp(request, NextResponse.next());
  }

  const pathnameWithoutLocale = pathname.replace(/^\/(en|id)/, "") || "/";
  const isApi = pathnameWithoutLocale.startsWith("/api");

  if (isApi && !pathnameWithoutLocale.startsWith("/api/health")) {
    const type: RateLimitType = pathnameWithoutLocale.startsWith("/api/admin")
      ? "ADMIN"
      : "API";

    const ratelimitResult = await checkRateLimit(request, type);
    if (!ratelimitResult.success) {
      return applyCsp(
        request,
        NextResponse.json(
          { error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED },
          {
            status: 429,
            headers: createRateLimitResponse(ratelimitResult).headers,
          },
        ),
      );
    }
  }

  const isConfigured = await isAppConfigured();

  if (!isConfigured) {
    const isSetupPage =
      pathnameWithoutLocale.startsWith("/setup") ||
      pathnameWithoutLocale.startsWith("/api/setup");

    if (isSetupPage) {
      return applyCsp(
        request,
        isApi ? NextResponse.next() : intlMiddleware(request),
      );
    }
    return applyCsp(
      request,
      NextResponse.redirect(new URL("/setup", request.url)),
    );
  }

  const authResult = await checkAuth(request, process.env.NEXTAUTH_SECRET);
  const { isAuthenticated, isGuest, is2FARequired, token } = authResult;
  const isSetupRoute =
    pathnameWithoutLocale.startsWith("/setup") ||
    pathnameWithoutLocale.startsWith("/api/setup");

  if (isConfigured && isSetupRoute) {
    if (!isAuthenticated) {
      return applyCsp(request, handleAuthRedirect(request, pathname));
    }

    if (isGuest || token?.role !== "ADMIN") {
      if (isApi) {
        return applyCsp(
          request,
          NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        );
      }
      return applyCsp(
        request,
        handleAuthRedirect(request, pathname, "RootAccessDenied"),
      );
    }

    if (is2FARequired && pathnameWithoutLocale !== "/verify-2fa") {
      if (isApi) {
        return applyCsp(
          request,
          NextResponse.json(
            { error: "2FA verification required" },
            { status: 403 },
          ),
        );
      }
      const verifyUrl = new URL("/verify-2fa", request.url);
      verifyUrl.searchParams.set("callbackUrl", pathname);
      return applyCsp(request, NextResponse.redirect(verifyUrl));
    }

    return applyCsp(
      request,
      isApi ? NextResponse.next() : intlMiddleware(request),
    );
  }

  if (
    (PUBLIC_PATHS.has(pathnameWithoutLocale) &&
      !pathnameWithoutLocale.startsWith("/setup")) ||
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return applyCsp(
      request,
      isApi ? NextResponse.next() : intlMiddleware(request),
    );
  }

  const shareToken = request.nextUrl.searchParams.get("share_token");
  if (shareToken) {
    return applyCsp(
      request,
      await validateShareToken(
        request,
        shareToken,
        pathname,
        isApi,
        intlMiddleware,
      ),
    );
  }

  if (!isAuthenticated && !isPublicRoute(pathnameWithoutLocale)) {
    return applyCsp(request, handleAuthRedirect(request, pathname));
  }

  if (
    isAuthenticated &&
    isGuest &&
    pathnameWithoutLocale.startsWith("/admin")
  ) {
    return applyCsp(
      request,
      handleAuthRedirect(request, pathname, "GuestAccessDenied"),
    );
  }

  const is2FAPage = pathnameWithoutLocale === "/verify-2fa";
  if (isAuthenticated && is2FARequired && !is2FAPage) {
    if (isApi) {
      return applyCsp(
        request,
        NextResponse.json(
          { error: "2FA verification required" },
          { status: 403 },
        ),
      );
    }
    const verifyUrl = new URL("/verify-2fa", request.url);
    verifyUrl.searchParams.set("callbackUrl", pathname);
    return applyCsp(request, NextResponse.redirect(verifyUrl));
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
    if (folderRes) return applyCsp(request, folderRes);
  }

  if (!isAuthenticated && !isPublicRoute(pathnameWithoutLocale)) {
    return applyCsp(request, handleAuthRedirect(request, pathname));
  }

  if (pathname.startsWith("/findpath")) {
    return applyCsp(request, await handleFindPath(request));
  }

  return applyCsp(
    request,
    isApi ? NextResponse.next() : intlMiddleware(request),
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};
