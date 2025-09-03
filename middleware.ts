// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { jwtVerify } from 'jose';

/**
 * Memvalidasi share token dari URL.
 * Mengembalikan status valid dan alasan jika tidak valid.
 */
async function handleShareToken(req: NextRequest): Promise<{ allowed: boolean; redirect?: NextResponse }> {
  const shareToken = req.nextUrl.searchParams.get('share_token');
  if (!shareToken) return { allowed: false };

  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);
    
    if (payload.loginRequired) {
      const sessionToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!sessionToken) {
        // Tandai sebagai tidak valid dengan alasan "butuh login"
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
        return { allowed: false, redirect: NextResponse.redirect(loginUrl) };
      }
    }
    // Token valid dan semua syarat terpenuhi
    return { allowed: true };
  } catch (error) {
    // Token tidak valid atau kedaluwarsa
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'InvalidOrExpiredShareLink');
    return { allowed: false, redirect: NextResponse.redirect(loginUrl) };
  }
}

export async function middleware(req: NextRequest) {
  const sessionToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const shareTokenResult = await handleShareToken(req);

  // Jika memiliki sesi ATAU tautan berbagi yang valid, siapkan untuk melanjutkan
  if (sessionToken || shareTokenResult.allowed) {
    const requestHeaders = new Headers(req.headers);
    // Selalu tambahkan header peran jika sesi ada, ini memperbaiki error 500
    if (sessionToken) {
      const userRole = (sessionToken.role as string) || 'USER';
      requestHeaders.set('x-user-role', userRole);
    }
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Jika tidak ada akses, lakukan pengalihan
  if (shareTokenResult.redirect) {
    return shareTokenResult.redirect;
  }
  
  // Pengalihan default untuk pengguna yang tidak login
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
  return NextResponse.redirect(loginUrl);
}

// Konfigurasi matcher tetap sama
export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|login|register).*)",
  ],
};