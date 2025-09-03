// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { jwtVerify } from 'jose';

async function handleShareToken(req: NextRequest): Promise<{ allowed: boolean; redirect?: NextResponse }> {
  const shareToken = req.nextUrl.searchParams.get('share_token');
  if (!shareToken) return { allowed: false };

  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);
    
    if (payload.loginRequired) {
      // --- PERBAIKAN: Gunakan AUTH_SECRET ---
      const sessionToken = await getToken({ req, secret: process.env.AUTH_SECRET });
      if (!sessionToken) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
        return { allowed: false, redirect: NextResponse.redirect(loginUrl) };
      }
    }
    return { allowed: true };
  } catch (error) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'InvalidOrExpiredShareLink');
    return { allowed: false, redirect: NextResponse.redirect(loginUrl) };
  }
}

export async function middleware(req: NextRequest) {
  // --- PERBAIKAN: Gunakan AUTH_SECRET ---
  const sessionToken = await getToken({ req, secret: process.env.AUTH_SECRET });
  const shareTokenResult = await handleShareToken(req);

  if (sessionToken || shareTokenResult.allowed) {
    const requestHeaders = new Headers(req.headers);
    if (sessionToken) {
      const userRole = (sessionToken.role as string) || 'USER';
      requestHeaders.set('x-user-role', userRole);
    }
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (shareTokenResult.redirect) {
    return shareTokenResult.redirect;
  }
  
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|login|register).*)",
  ],
};