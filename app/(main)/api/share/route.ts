// File: app/(main)/api/share/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import crypto from 'crypto';

interface ShareRequestBody {
  path: string;
  type: 'timed' | 'session';
  expiresIn: string;
  loginRequired?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Izin admin diperlukan.' }, { status: 403 });
    }
    
    const { path, type, expiresIn, loginRequired }: ShareRequestBody = await req.json();
    
    if (!path || !type || !expiresIn) {
      return NextResponse.json({ error: 'Path, type, dan expiresIn diperlukan.' }, { status: 400 });
    }
    
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const jti = crypto.randomUUID(); // Buat ID unik untuk token

    const token = await new SignJWT({ path, loginRequired: loginRequired ?? false })
       .setProtectedHeader({ alg: 'HS256' })
       .setIssuedAt()
       .setExpirationTime(expiresIn)
       .setJti(jti) // Tetapkan JTI pada token
       .sign(secret);

    const shareableUrl = `${req.nextUrl.origin}${path}?share_token=${token}`;

    // Sertakan 'token' dan 'jti' dalam respons
    return NextResponse.json({ shareableUrl, token, jti });

  } catch (error) {
    console.error('Error generating share link:', error);
    return NextResponse.json({ error: 'Gagal membuat tautan berbagi.' }, { status: 500 });
  }
}