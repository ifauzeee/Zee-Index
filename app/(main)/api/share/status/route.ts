// File: app/(main)/api/share/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { kv } from '@/lib/kv';

export async function POST(req: NextRequest) {
  try {
    const { shareToken } = await req.json();

    if (!shareToken) {
      return NextResponse.json({ valid: false, error: 'Token not provided' }, { status: 400 });
    }

    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);

    if (typeof payload.jti !== 'string') {
      return NextResponse.json({ valid: false, error: 'Invalid token JTI' }, { status: 400 });
    }

    // Periksa apakah JTI ada di blocklist KV
    const isBlocked = await kv.get(`zee-index:blocked:${payload.jti}`);

    if (isBlocked) {
      // Jika diblokir, token tidak valid
      return NextResponse.json({ valid: false });
    }

    // Jika tidak diblokir dan verifikasi JWT berhasil, token valid
    return NextResponse.json({ valid: true });

  } catch (error) {
    // Jika jwtVerify gagal (misalnya, token kedaluwarsa atau tidak valid), anggap tidak valid
    return NextResponse.json({ valid: false });
  }
}