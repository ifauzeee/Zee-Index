import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export interface MiddlewareAuthResult {
  isAuthenticated: boolean;
  isGuest: boolean;
  is2FARequired: boolean;
  token: any;
}

export async function checkAuth(
  request: NextRequest,
  secret: string | undefined,
): Promise<MiddlewareAuthResult> {
  const token = await getToken({
    req: request,
    secret,
    cookieName: "next-auth.session-token",
    secureCookie: false,
  });

  if (!token) {
    return {
      isAuthenticated: false,
      isGuest: false,
      is2FARequired: false,
      token: null,
    };
  }

  return {
    isAuthenticated: true,
    isGuest: !!token.isGuest,
    is2FARequired: !!token.twoFactorRequired,
    token,
  };
}

export function handleAuthRedirect(
  request: NextRequest,
  pathname: string,
  error?: string,
) {
  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  if (error) {
    loginUrl.searchParams.set("error", error);
  }
  return NextResponse.redirect(loginUrl);
}
