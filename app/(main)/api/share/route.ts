// File: app/(main)/api/share/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import crypto from 'crypto';
import { kv } from '@/lib/kv';
import type { ShareLink } from '@/lib/store';

interface ShareRequestBody {
  path: string;
  itemName: string;
  type: 'timed' | 'session';
  expiresIn: string;
  loginRequired?: boolean;
}

const SHARE_LINKS_KEY = 'zee-index:share-links';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Izin admin diperlukan.' }, { status: 403 });
    }
    
    const { path, itemName, type, expiresIn, loginRequired }: ShareRequestBody = await req.json();
    
    if (!path || !type || !expiresIn || !itemName) {
       return NextResponse.json({ error: 'Path, itemName, type, dan expiresIn diperlukan.' }, { status: 400 });
    }
    
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const jti = crypto.randomUUID();

    const token = await new SignJWT({ path, loginRequired: loginRequired ?? false })
       .setProtectedHeader({ alg: 'HS256' })
       .setIssuedAt()
       .setExpirationTime(expiresIn)
       .setJti(jti)
       .sign(secret);

    const shareableUrl = `${req.nextUrl.origin}${path}?share_token=${token}`;

    const decodedToken: any = jwtDecode(token);
    const newShareLink: ShareLink = {
      id: jti, // Gunakan JTI sebagai ID unik
      path,
      token,
      jti,
      expiresAt: new Date(decodedToken.exp * 1000).toISOString(),
      loginRequired: loginRequired ?? false,
      itemName,
    };

    // Ambil daftar yang ada, tambahkan yang baru, lalu simpan kembali
    const existingLinks: ShareLink[] = (await kv.get(SHARE_LINKS_KEY)) || [];
    const updatedLinks = [...existingLinks, newShareLink];
    await kv.set(SHARE_LINKS_KEY, updatedLinks);

    return NextResponse.json({ shareableUrl, token, jti, newShareLink });

  } catch (error) {
    console.error('Error generating share link:', error);
    return NextResponse.json({ error: 'Gagal membuat tautan berbagi.' }, { status: 500 });
  }
}

// Fungsi untuk decode token (diperlukan di sini karena `jose` tidak menyediakan decode tanpa verifikasi)
function jwtDecode(token: string) {
    try {
        const payload = token.split('.')[1];
        const decoded = Buffer.from(payload, 'base64').toString('utf8');
        return JSON.parse(decoded);
    } catch (e) {
        return null;
    }
}