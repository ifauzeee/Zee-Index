import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { jwtVerify } from 'jose';

// Helper to check if a share token is valid
async function isShareTokenValid(req: NextRequest): Promise<{ valid: boolean; redirect?: NextResponse }> {
  const shareToken = req.nextUrl.searchParams.get('share_token');
  if (!shareToken) return { valid: false };

  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);
    
    // If token requires login, check for a session
    if (payload.loginRequired) {
      const sessionToken = await getToken({ req, secret: process.env.AUTH_SECRET });
      if (!sessionToken) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
        return { valid: false, redirect: NextResponse.redirect(loginUrl) };
      }
    }
    // Token is valid and all conditions are met
    return { valid: true };
  } catch (error) {
    // Token is invalid or expired
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'InvalidOrExpiredShareLink');
    return { valid: false, redirect: NextResponse.redirect(loginUrl) };
  }
}

export async function middleware(req: NextRequest) {
  const sessionToken = await getToken({ req, secret: process.env.AUTH_SECRET });
  const shareTokenResult = await isShareTokenValid(req);
  const shareToken = req.nextUrl.searchParams.get('share_token');

  // Allow access if user has a session OR a valid share token
  if (sessionToken || shareTokenResult.valid) {
    const requestHeaders = new Headers(req.headers);
    // If session exists, add the user role header for admin features
    if (sessionToken) {
      requestHeaders.set('x-user-role', (sessionToken.role as string) || 'USER');
    }
    // If accessed via a valid share token, pass that token in the headers
    if (shareTokenResult.valid && shareToken) {
      requestHeaders.set('x-share-token', shareToken);
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // If no access, perform the redirect
  if (shareTokenResult.redirect) {
    return shareTokenResult.redirect;
  }
  
  // Default redirect for unauthenticated users
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
  return NextResponse.redirect(loginUrl);
}

// The matcher should NOT exclude /api routes, so the middleware can protect them
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|register|api/auth).*)",
  ],
};