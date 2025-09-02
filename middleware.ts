// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

async function verifyToken(token: string) {
    try {
        const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
        const { payload } = await jwtVerify(token, secret, {
            issuer: 'urn:zee-index:issuer',
            audience: 'urn:zee-index:audience',
        });
        return payload;
    } catch {
        return null;
    }
}

export async function middleware(request: NextRequest) {
  if (process.env.SITE_PROTECTION_ENABLED !== 'true') {
    return NextResponse.next();
  }

  const { pathname, searchParams } = request.nextUrl;
  const publicPaths = ['/login', '/api/auth/login'];
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get('site_auth_token');
  if (authToken?.value === 'true') {
    return NextResponse.next();
  }

  // Perbaikan: Hapus logika cookie sesi yang lama
  const shareToken = searchParams.get('share_token');
  if (shareToken) {
    const payload = await verifyToken(shareToken);
    if (payload && typeof payload.path === 'string') {
        
        if (!pathname.startsWith(payload.path) && !pathname.startsWith('/api/')) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        if (payload.type === 'timed') {
            return NextResponse.next();
        } else if (payload.type === 'session') {
            // Perbaikan: Hapus logika redirect dan biarkan permintaan berlanjut
            return NextResponse.next();
        }
    }
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect_url', pathname + searchParams.toString());
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!api/auth/logout|_next/static|_next/image|favicon.ico).*)',
  ],
};