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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname.startsWith("/static")
  ) {
    return NextResponse.next();
  }

  const pathnameWithoutLocale = pathname.replace(/^\/(en|id)/, "") || "/";

  const isConfigured = !!process.env.GOOGLE_REFRESH_TOKEN;
  if (!isConfigured) {
    if (
      pathnameWithoutLocale.startsWith("/setup") ||
      pathnameWithoutLocale.startsWith("/api/setup")
    ) {
      if (pathname.startsWith("/api")) return NextResponse.next();
      return intlMiddleware(request);
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
    if (pathname.startsWith("/api")) return NextResponse.next();
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

      if (pathname.startsWith("/api")) return NextResponse.next();
      return intlMiddleware(request);
    } catch (error) {
      console.error("Share token verification failed:", error);
      if (pathname.startsWith("/api/")) {
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
    const isPublicRoute = ["/folder", "/share", "/request", "/login"].some(
      (p) => pathnameWithoutLocale.startsWith(p),
    );

    if (isPublicRoute) {
      if (pathname.startsWith("/api")) return NextResponse.next();
      return intlMiddleware(request);
    }
    return handleAuthRedirect(request, pathname);
  }

  if (isGuest && pathnameWithoutLocale.startsWith("/admin")) {
    return handleAuthRedirect(request, pathname, "GuestAccessDenied");
  }

  if (is2FARequired && pathnameWithoutLocale !== "/verify-2fa") {
    const verifyUrl = new URL("/verify-2fa", request.url);
    verifyUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(verifyUrl);
  }

  if (!is2FARequired && pathnameWithoutLocale === "/verify-2fa") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/api")) return NextResponse.next();
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
