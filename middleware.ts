// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { jwtVerify } from 'jose';

/**
 * Memvalidasi share token dari URL.
 * Mengembalikan status valid dan alasan jika tidak valid.
 */
async function isShareTokenValid(req: NextRequest): Promise<{ valid: boolean; error?: string }> {
  const shareToken = req.nextUrl.searchParams.get('share_token');
  if (!shareToken) return { valid: false };

  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);
    
    // Jika token memerlukan login, periksa apakah ada sesi login
    if (payload.loginRequired) {
      const sessionToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!sessionToken) {
        // Tandai sebagai tidak valid dengan alasan "butuh login"
        return { valid: false, error: 'LoginRequired' };
      }
    }
    // Token valid dan semua syarat terpenuhi
    return { valid: true };
  } catch (error) {
    // Tangkap semua error dari jwtVerify (termasuk kedaluwarsa atau format salah)
    return { valid: false, error: 'InvalidOrExpiredShareLink' };
  }
}

export async function middleware(req: NextRequest) {
  const sessionToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const shareTokenValidation = await isShareTokenValid(req);

  // Izinkan akses jika pengguna memiliki sesi login yang valid ATAU tautan berbagi yang valid.
  if (sessionToken || shareTokenValidation.valid) {
    // Jika pengguna memiliki sesi, tambahkan header peran (role) untuk API
    if (sessionToken) {
      const requestHeaders = new Headers(req.headers);
      const userRole = (sessionToken.role as string) || 'USER';
      requestHeaders.set('x-user-role', userRole);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    // Jika hanya punya share token (tanpa sesi), lanjutkan tanpa header tambahan
    return NextResponse.next();
  }
  
  // Jika akses ditolak, siapkan URL untuk redirect ke halaman login
  const loginUrl = new URL('/login', req.url);

  // Tentukan alasan redirect berdasarkan hasil validasi share token
  if (shareTokenValidation.error === 'InvalidOrExpiredShareLink') {
    loginUrl.searchParams.set('error', 'InvalidOrExpiredShareLink');
  } else if (shareTokenValidation.error === 'LoginRequired') {
    // Jika butuh login, simpan URL asli agar bisa kembali setelah login
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
  } else {
    // Jika tidak ada share token, ini adalah akses biasa tanpa sesi
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
  }
  
  return NextResponse.redirect(loginUrl);
}

// Konfigurasi matcher untuk melindungi rute yang relevan
export const config = {
  matcher: [
    /*
     * Cocokkan semua path KECUALI yang dimulai dengan:
     * - /api/ (Semua rute API internal, termasuk /api/auth)
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - /login
     * - /register
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|login|register).*)",
  ],
};