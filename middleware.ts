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
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/config/public", "/api/setup"];

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
    pathname === "/manifest.webmanifest"
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
        return NextResponse.redirect(new URL("/login", request.url));
      }

      const secret = new TextEncoder().encode(shareSecretKey);
      const { payload } = await jwtVerify(shareToken, secret);

      if (payload.loginRequired) {
        const { isAuthenticated } = await checkAuth(
          request,
          process.env.NEXTAUTH_SECRET,
        );
        if (!isAuthenticated) {
          const loginUrl = new URL("/login", request.url);
          loginUrl.searchParams.set("callbackUrl", request.url);
          loginUrl.searchParams.set("error", "GuestAccessDenied");
          return NextResponse.redirect(loginUrl);
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

  if (!isAuthenticated) {
    if (isPublicRoute(pathnameWithoutLocale)) {
      return isApi ? NextResponse.next() : intlMiddleware(request);
    }
    return handleAuthRedirect(request, pathname);
  }

  if (isGuest && pathnameWithoutLocale.startsWith("/admin")) {
    return handleAuthRedirect(request, pathname, "GuestAccessDenied");
  }

  const is2FAPage = pathnameWithoutLocale === "/verify-2fa";
  if (is2FARequired && !is2FAPage) {
    const verifyUrl = new URL("/verify-2fa", request.url);
    verifyUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(verifyUrl);
  }

  if (!is2FARequired && is2FAPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return isApi ? NextResponse.next() : intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
