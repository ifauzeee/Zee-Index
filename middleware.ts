import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { checkAuth, handleAuthRedirect } from "@/lib/auth-check";
import {
  checkRateLimit,
  createRateLimitResponse,
  type RateLimitType,
} from "@/lib/ratelimit";
import { validateApiKey } from "@/lib/api-key";
import { ERROR_MESSAGES } from "@/lib/constants";
import { isAppConfigured } from "@/lib/config";
import {
  validateShareToken,
  validateFolderToken,
  handleFindPath,
  validateDownloadTokenSignature,
} from "@/lib/middleware-helpers";
import {
  LOCALES,
  DEFAULT_LOCALE,
  isLocale,
  stripLocaleFromPathname,
} from "@/lib/i18n-config";

const intlMiddleware = createMiddleware({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
});

const PUBLIC_PATHS = new Set(["/login", "/verify-2fa", "/setup", "/request"]);
// Public only when the route itself enforces auth/share checks.
// Prefer exact prefixes for read-only public surfaces; mutations use create*Route.
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/config/public",
  "/api/config",
  "/api/setup",
  "/api/files",
  "/api/folderpath",
  "/api/filedetails",
  "/api/download",
  "/api/proxy-image",
  "/api/admin/analytics/track",
  "/api/health",
  "/api/metadata",
  "/api/search",
  "/api/manual-drives",
  "/api/share/track",
  "/api/share/items",
  "/api/file-request/upload",
  "/api/cron",
];

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

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

export function createContentSecurityPolicy(
  nonce: string,
  options?: { allowUnsafeEval?: boolean },
): string {
  // unsafe-eval is needed by some dev tooling / Monaco; omit in production.
  const allowUnsafeEval =
    options?.allowUnsafeEval ?? process.env.NODE_ENV !== "production";
  const scriptEval = allowUnsafeEval ? " 'unsafe-eval'" : "";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${scriptEval} https://cdn.jsdelivr.net https://www.google-analytics.com`,
    `script-src-elem 'self' 'nonce-${nonce}'${scriptEval} https://cdn.jsdelivr.net https://www.google-analytics.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.googleusercontent.com https://drive.google.com https://images.unsplash.com https://image.tmdb.org",
    "media-src 'self' blob: https://*.googleapis.com",
    "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.googleusercontent.com https://cdn.jsdelivr.net https://www.google-analytics.com",
    "frame-src 'self' https://accounts.google.com https://drive.google.com https://view.officeapps.live.com",
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

  const pathnameWithoutLocale = stripLocaleFromPathname(pathname) || "/";
  const isApi = pathnameWithoutLocale.startsWith("/api");

  // API key authentication (runs for all API routes).
  // If valid, sets x-auth-method=api-key headers and skips session auth downstream.
  let isApiKeyRequest = false;
  let apiKeyRequestOverride: NextResponse | null = null;

  if (isApi) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const rawKey = authHeader.slice(7);
      if (rawKey.length >= 16) {
        const apiKeyData = await validateApiKey(rawKey);
        if (apiKeyData) {
          isApiKeyRequest = true;
          const requestHeaders = new Headers(request.headers);
          requestHeaders.set("x-auth-method", "api-key");
          requestHeaders.set("x-api-key-id", apiKeyData.id);
          requestHeaders.set("x-api-key-name", apiKeyData.name);
          requestHeaders.set(
            "x-api-key-permissions",
            apiKeyData.permissions.join(","),
          );
          apiKeyRequestOverride = NextResponse.next({
            request: { headers: requestHeaders },
          });
        }
      }
    }

    // Rate limiting: API key requests use API_KEY tier with key ID as identifier;
    // non-API-key requests use IP-based limiting.
    if (isApiKeyRequest && apiKeyRequestOverride) {
      const apiKeyId =
        apiKeyRequestOverride.headers.get(
          "x-middleware-request-x-api-key-id",
        ) || "unknown";
      const type: RateLimitType = "API_KEY";
      const ratelimitResult = await checkRateLimit(request, type, apiKeyId);
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
    } else {
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

    // APIs must not follow HTML redirects — return a JSON error instead.
    if (isApi) {
      return applyCsp(
        request,
        NextResponse.json(
          { error: ERROR_MESSAGES.APP_NOT_CONFIGURED },
          { status: 503 },
        ),
      );
    }

    return applyCsp(
      request,
      NextResponse.redirect(new URL("/setup", request.url)),
    );
  }

  // API key requests skip session auth — route handlers check permissions via headers.
  if (isApiKeyRequest && apiKeyRequestOverride) {
    return applyCsp(request, apiKeyRequestOverride);
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
      const requestedLocale = pathname.split("/")[1];
      const locale = isLocale(requestedLocale)
        ? requestedLocale
        : DEFAULT_LOCALE;
      const translations = {
        en: {
          title: "Access Denied",
          heading: "Access Denied",
          message: "Only administrators can access the Setup page.",
          button: "Login as Admin",
          footer: "Zee Index",
        },
        id: {
          title: "Akses Ditolak",
          heading: "Akses Ditolak",
          message: "Hanya admin yang dapat mengakses halaman Setup.",
          button: "Login sebagai Admin",
          footer: "Zee Index",
        },
        "zh-TW": {
          title: "拒絕訪問",
          heading: "拒絕訪問",
          message: "只有管理員才能訪問設置頁面。",
          button: "以管理員身分登錄",
          footer: "Zee Index",
        },
      };
      const t =
        translations[locale as keyof typeof translations] || translations.en;

      return applyCsp(
        request,
        new NextResponse(
          `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
      background: hsl(222.2, 84%, 4.9%);
      color: hsl(210, 40%, 98%);
      -webkit-font-smoothing: antialiased;
    }
    .container {
      display: flex; flex-direction: column; align-items: center;
      padding: 2rem; width: 100%; max-width: 400px; text-align: center;
    }
    .icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 3rem; height: 3rem;
      background: hsl(215, 20.2%, 15%);
      border-radius: 50%;
      margin-bottom: 1.5rem;
    }
    .icon svg { width: 1.5rem; height: 1.5rem; color: hsl(215, 20.2%, 65.1%); }
    h1 {
      font-size: 1.5rem; font-weight: 600;
      margin-bottom: 0.5rem;
    }
    p {
      color: hsl(215, 20.2%, 65.1%);
      line-height: 1.5; margin-bottom: 1.5rem;
      font-size: 0.9375rem;
    }
    .btn {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 1.5rem;
      background: hsl(210, 40%, 98%);
      color: hsl(222.2, 47.4%, 11.2%);
      text-decoration: none; border-radius: 0.5rem;
      font-weight: 500; font-size: 0.875rem;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.9; }
    .btn svg { width: 1rem; height: 1rem; }
    .footer { margin-top: 3rem; font-size: 0.75rem; color: hsl(215, 20.2%, 40%); }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </div>
    <h1>${t.heading}</h1>
    <p>${t.message}</p>
    <a href="/login" class="btn">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
      ${t.button}
    </a>
    <p class="footer">&copy; ${new Date().getFullYear()} ${t.footer}</p>
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
    isPublicApiPath(pathname)
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
