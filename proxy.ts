import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { checkAuth, handleAuthRedirect } from "@/lib/auth-check";
import {
  checkRateLimit,
  createRateLimitResponse,
  type RateLimitType,
} from "@/lib/ratelimit";
import { validateApiKey } from "@/lib/api-key";
import { ERROR_MESSAGES, SWAGGER_UI_CDN } from "@/lib/constants";
import { isAppConfigured } from "@/lib/config";
import { announceSetupToken } from "@/lib/setup-token";
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
import { getForbiddenPageHtml } from "@/lib/forbidden-page";

const intlMiddleware = createMiddleware({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
});

const PUBLIC_PATHS = new Set(["/login", "/verify-2fa", "/setup", "/request"]);
// Public only when the route itself enforces auth/share checks.
// Exact paths let the route wrapper decide; prefixes cover sub-routes the
// handler owns (auth callbacks, setup steps, share item reads, cron jobs).
const PUBLIC_API_EXACT = new Set([
  "/api/config",
  "/api/config/public",
  "/api/files",
  "/api/folderpath",
  "/api/filedetails",
  "/api/download",
  "/api/proxy-image",
  "/api/admin/analytics/track",
  "/api/health",
  // Social crawlers fetch OG images without a session (Z2-22). The route
  // clamps the title and is rate-limited.
  "/api/og",
  "/api/metadata",
  "/api/search",
  "/api/search/global",
  "/api/manual-drives",
  "/api/share/track",
  "/api/file-request/upload",
]);

const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/setup",
  "/api/share/items",
  "/api/cron",
];

export function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_API_EXACT.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
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
  // unsafe-eval is needed by recharts (new Function() for tooltip rendering).
  // Omit only if no chart library requires it.
  const allowUnsafeEval = options?.allowUnsafeEval ?? true;
  const scriptEval = allowUnsafeEval ? " 'unsafe-eval'" : "";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${scriptEval} ${SWAGGER_UI_CDN}/ https://www.google-analytics.com`,
    `script-src-elem 'self' 'nonce-${nonce}'${scriptEval} ${SWAGGER_UI_CDN}/ https://www.google-analytics.com`,
    // blob: lets epub.js apply a book's own stylesheets, which it loads as
    // blob URLs into the sandboxed (script-free) reader iframe.
    `style-src 'self' 'unsafe-inline' blob: https://fonts.googleapis.com ${SWAGGER_UI_CDN}/`,
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.googleusercontent.com https://drive.google.com https://images.unsplash.com https://image.tmdb.org",
    "media-src 'self' blob: https://*.googleapis.com",
    "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.googleusercontent.com https://www.google-analytics.com",
    "frame-src 'self' https://accounts.google.com https://drive.google.com https://view.officeapps.live.com",
    "worker-src 'self' blob:",
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

const API_KEY_AUTH_HEADERS = [
  "x-auth-method",
  "x-api-key-id",
  "x-api-key-name",
  "x-api-key-permissions",
];

/**
 * Copy `request` without the API key auth headers a client may have sent.
 * Rebuild from the original request with replaced headers: constructing a
 * new request from a clone drops headers in the middleware runtime (seen in
 * production as a missing auth cookie, which fails NextAuth CSRF checks),
 * so never go back to `new NextRequest(request.clone())` here.
 */
function withApiKeyHeadersStripped(request: NextRequest): NextRequest {
  const headers = new Headers(request.headers);
  for (const header of API_KEY_AUTH_HEADERS) {
    headers.delete(header);
  }
  return new NextRequest(request, { headers });
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

// Next.js 16 runs `proxy.ts` on the Node.js runtime. As `middleware.ts` this
// ran on the Edge runtime, where the KV client was a per-process in-memory
// store and Prisma was unavailable, so share revocations, API-key checks and
// rate limits here never saw the real Redis/Postgres state (audit Z2-10).
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest"
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/health")) {
    // Health skips auth and rate limiting, but route wrappers read
    // x-auth-method, so keep the invariant that only this middleware sets
    // it. Forward the sanitized headers; a plain next() keeps them.
    const sanitized = withApiKeyHeadersStripped(request);
    return NextResponse.next({ request: { headers: sanitized.headers } });
  }

  if (pathname.startsWith("/api/download")) {
    // The early exit forwards request headers through applyCsp, so forged
    // API key headers must be stripped before the signature check too.
    request = withApiKeyHeadersStripped(request);
    const signatureError = await validateDownloadTokenSignature(request);
    if (signatureError) {
      return applyCsp(request, signatureError);
    }
    return applyCsp(request, NextResponse.next());
  }

  const pathnameWithoutLocale = stripLocaleFromPathname(pathname) || "/";
  const isApi = pathnameWithoutLocale.startsWith("/api");

  if (isApi) {
    // These headers describe the API key that authenticated the request, so
    // only this middleware may set them. Strip any client-supplied copy so a
    // caller cannot impersonate an API key without presenting one.
    request = withApiKeyHeadersStripped(request);
  }

  // API key authentication (runs for all API routes).
  // If valid, sets x-auth-method=api-key headers and skips session auth downstream.
  let isApiKeyRequest = false;
  let apiKeyRequestOverride: NextResponse | null = null;

  if (isApi) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const rawKey = authHeader.slice(7);
      // API keys are 64-char hex strings (two concatenated UUIDs with hyphens removed).
      // Strict format check prevents malformed tokens from obtaining the higher
      // API_KEY rate-limit tier (1000/min vs 500/min for regular API requests).
      if (/^[0-9a-f]{64}$/i.test(rawKey)) {
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
    // Print the first-run setup token to the server log (once per process).
    announceSetupToken();
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

      return applyCsp(
        request,
        new NextResponse(getForbiddenPageHtml(locale), {
          status: 403,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
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
    isPublicApiPath(pathnameWithoutLocale)
  ) {
    return applyCsp(
      request,
      isApi ? NextResponse.next() : intlMiddleware(request),
    );
  }

  const shareToken = request.nextUrl.searchParams.get("share_token");
  if (shareToken) {
    const shareResponse = await validateShareToken(
      request,
      shareToken,
      pathname,
      isApi,
    );
    if (shareResponse) {
      return applyCsp(request, shareResponse);
    }
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
