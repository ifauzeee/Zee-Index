// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { id, password } = await request.json();

    const siteId = process.env.SITE_ID;
    const sitePassword = process.env.SITE_PASSWORD;

    // **Peringatan Keamanan**: Perbandingan string sederhana rentan terhadap timing attacks.
    // Di lingkungan produksi, gunakan fungsi perbandingan yang aman.
    const isIdValid = crypto.timingSafeEqual(Buffer.from(id), Buffer.from(siteId!));
    const isPasswordValid = crypto.timingSafeEqual(Buffer.from(password), Buffer.from(sitePassword!));

    if (isIdValid && isPasswordValid) {
      // Set cookie sebagai penanda otentikasi
      cookies().set('site_auth_token', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 minggu
        path: '/',
        sameSite: 'lax',
      });
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}