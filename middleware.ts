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
        new NextResponse(
          `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Akses Ditolak - Zee Index</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
      background: #0b0d14;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; width: 100%; }
    .card {
      background: #181b26;
      border: 1px solid #272b3b;
      border-radius: 0.75rem;
      padding: 3rem 2.5rem;
      text-align: center;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .icon-wrapper {
      display: inline-flex; align-items: center; justify-content: center;
      width: 4rem; height: 4rem;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 9999px;
      margin-bottom: 1.5rem;
    }
    .icon-wrapper svg { width: 2rem; height: 2rem; color: #ef4444; }
    h1 {
      font-size: 1.5rem; font-weight: 700; letter-spacing: -0.025em;
      margin-bottom: 0.75rem;
      background: linear-gradient(to right, #e2e8f0, #60a5fa);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    p { color: #94a3b8; line-height: 1.7; margin-bottom: 2rem; font-size: 0.9375rem; }
    .btn {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: #e2e8f0; color: #0b0d14;
      text-decoration: none; border-radius: 0.5rem;
      font-weight: 600; font-size: 0.875rem;
      transition: all 0.15s ease;
    }
    .btn:hover { background: #f1f5f9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(226, 232, 240, 0.15); }
    .btn svg { width: 1.125rem; height: 1.125rem; }
    .footer { margin-top: 2rem; font-size: 0.75rem; color: #475569; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h1>Akses Ditolak</h1>
      <p>Maaf, hanya admin yang dapat mengakses halaman Setup.<br>Silakan login dengan akun admin.</p>
      <a href="/login" class="btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        Login sebagai Admin
      </a>
    </div>
    <p class="footer">&copy; ${new Date().getFullYear()} Zee Index</p>
  </div>
</body>
</html>`,
          {
            status: 403,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          },
        ),
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
