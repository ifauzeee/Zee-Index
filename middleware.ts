import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { jwtVerify } from 'jose';

export async function middleware(req: NextRequest) {
    const shareToken = req.nextUrl.searchParams.get('share_token');
    const sessionToken = await getToken({ req, secret: process.env.AUTH_SECRET });

    // Skenario 1: Ada Tautan Berbagi (Share Link)
    if (shareToken) {
        try {
            const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
            const { payload } = await jwtVerify(shareToken, secret);
            
            if (payload.loginRequired && !sessionToken) {
                const loginUrl = new URL('/login', req.url);
                loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
                return NextResponse.redirect(loginUrl);
            }
            
            // Token valid, lanjutkan
            return NextResponse.next();

        } catch (error) {
            // Token tidak valid atau kedaluwarsa
            const loginUrl = new URL('/login', req.url);
            loginUrl.searchParams.set('error', 'InvalidOrExpiredShareLink');
            return NextResponse.redirect(loginUrl);
        }
    }

    // Skenario 2: Tidak ada Tautan Berbagi
    if (!sessionToken) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
        return NextResponse.redirect(loginUrl);
    }

    // Skenario 3: Pengguna sudah login dengan sesi normal
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-role', (sessionToken.role as string) || 'USER');
    
    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

// Konfigurasi matcher tetap sama
export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|login|register).*)",
  ],
};