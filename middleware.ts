import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";
import createMiddleware from "next-intl/middleware";

const intlMiddleware = createMiddleware({
  locales: ["en", "id"],
  defaultLocale: "id",
  localePrefix: "always",
  localeDetection: true,
});

const PUBLIC_PATHS = new Set([
  "/login",
  "/icon.png",
  "/verify-2fa",
  "/setup",
  "/manifest.webmanifest",
  "/sw.js",
  "/workbox-",
]);

const PUBLIC_API_PREFIXES = ["/api/auth", "/api/config/public", "/api/setup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes("workbox") ||
    pathname.includes("swe-worker")
  ) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api");

  const GLOBAL_APIS = ["/api/health", "/api/proxy-image", "/api/setup"];
  if (isApi && GLOBAL_APIS.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const localeMatch = pathname.match(/^\/(en|id)(\/|$)/);

  if (isApi && !localeMatch) {
    return NextResponse.redirect(
      new URL(`/id${pathname}${request.nextUrl.search}`, request.url),
    );
  }

  const publicPathname = localeMatch
    ? pathname.replace(/^\/(en|id)/, "") || "/"
    : pathname;

  const isConfigured = !!process.env.GOOGLE_REFRESH_TOKEN;

  if (!isConfigured) {
    if (
      publicPathname.startsWith("/setup") ||
      publicPathname.startsWith("/api/setup") ||
      publicPathname === "/icon.png"
    ) {
      if (isApi || publicPathname === "/icon.png") return NextResponse.next();
      return intlMiddleware(request);
    }
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  if (isConfigured && publicPathname.startsWith("/setup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    PUBLIC_PATHS.has(publicPathname) ||
    PUBLIC_API_PREFIXES.some((p) => publicPathname.startsWith(p))
  ) {
    if (
      isApi ||
      Array.from(PUBLIC_PATHS).some(
        (p) => p.includes(".") && publicPathname === p,
      )
    ) {
      return NextResponse.next();
    }
    return intlMiddleware(request);
  }

  const shareToken = request.nextUrl.searchParams.get("share_token");
  if (shareToken) {
    try {
      const shareSecretKey = process.env.SHARE_SECRET_KEY;
      if (!shareSecretKey || shareSecretKey.length < 32) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      const secret = new TextEncoder().encode(shareSecretKey);
      const { payload } = await jwtVerify(shareToken, secret);

      if (payload.loginRequired) {
        const token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
          const loginUrl = new URL("/login", request.url);
          loginUrl.searchParams.set("callbackUrl", request.url);
          loginUrl.searchParams.set("error", "GuestAccessDenied");
          return NextResponse.redirect(loginUrl);
        }
      }
      if (isApi) return intlMiddleware(request);
      return intlMiddleware(request);
    } catch (error) {
      console.error("Share token verification failed:", error);

      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "ShareLinkExpired" },
          { status: 401 },
        );
      }

      const urlWithoutToken = request.nextUrl.clone();
      urlWithoutToken.searchParams.delete("share_token");

      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "ShareLinkExpired");
      loginUrl.searchParams.set("callbackUrl", urlWithoutToken.toString());

      return NextResponse.redirect(loginUrl);
    }
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const isPublicRoute = ["/folder", "/share", "/request"].some((p) =>
      publicPathname.startsWith(p),
    );

    if (isPublicRoute) {
      if (isApi) return intlMiddleware(request);
      return intlMiddleware(request);
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token.isGuest && publicPathname.startsWith("/admin")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "GuestAccessDenied");
    return NextResponse.redirect(loginUrl);
  }

  if (token.twoFactorRequired && publicPathname !== "/verify-2fa") {
    const verifyUrl = new URL("/verify-2fa", request.url);
    verifyUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(verifyUrl);
  }

  if (!token.twoFactorRequired && publicPathname === "/verify-2fa") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
