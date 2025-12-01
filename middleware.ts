import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";

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

  const isConfigured = !!process.env.GOOGLE_REFRESH_TOKEN;

  if (!isConfigured) {
    if (
      pathname.startsWith("/setup") ||
      pathname.startsWith("/api/setup") ||
      pathname === "/icon.png"
    ) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  if (isConfigured && pathname.startsWith("/setup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes("workbox")
  ) {
    return NextResponse.next();
  }

  const shareToken = request.nextUrl.searchParams.get("share_token");
  if (shareToken) {
    try {
      const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY);
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
      return NextResponse.next();
    } catch (error) {
      console.error(error);
    }
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const isPublicRoute = ["/folder", "/share", "/request"].some((p) =>
      pathname.startsWith(p),
    );

    if (isPublicRoute) return NextResponse.next();

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token.isGuest && pathname.startsWith("/admin")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "GuestAccessDenied");
    return NextResponse.redirect(loginUrl);
  }

  if (token.twoFactorRequired && pathname !== "/verify-2fa") {
    const verifyUrl = new URL("/verify-2fa", request.url);
    verifyUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(verifyUrl);
  }

  if (!token.twoFactorRequired && pathname === "/verify-2fa") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
