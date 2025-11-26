import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isConfigured = !!process.env.GOOGLE_REFRESH_TOKEN;

  if (isConfigured && pathname.startsWith("/setup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    !isConfigured &&
    !pathname.startsWith("/setup") &&
    !pathname.startsWith("/api/setup")
  ) {
    const allowedPaths = ["/login", "/api/auth", "/icon.png"];
    const isAllowed = allowedPaths.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/setup", request.url));
    }
  }

  const publicPaths = [
    "/login",
    "/api/auth/callback/google",
    "/api/auth/callback/guest",
    "/api/auth/signin",
    "/api/auth/error",
    "/api/auth/providers",
    "/api/auth/session",
    "/api/auth/csrf",
    "/icon.png",
    "/verify-2fa",
    "/api/config/public",
    "/folder",
    "/share",
    "/api/files",
    "/api/download",
    "/api/share/items",
    "/api/folderpath",
    "/api/share/status",
    "/setup",
    "/api/setup/finish",
  ];

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && token.isGuest) {
    if (pathname.startsWith("/admin")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      loginUrl.searchParams.set("error", "GuestAccessDenied");
      return NextResponse.redirect(loginUrl);
    }
  }

  if (token && token.twoFactorRequired) {
    if (pathname !== "/verify-2fa") {
      const verifyUrl = new URL("/verify-2fa", request.url);
      verifyUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(verifyUrl);
    }
  }

  if (token && !token.twoFactorRequired && pathname === "/verify-2fa") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
