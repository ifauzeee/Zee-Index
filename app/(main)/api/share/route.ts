// app/(main)/api/share/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

// Perbarui tipe untuk request body
interface ShareRequestBody {
  path: string;
  type: 'timed' | 'session';
  expiresIn: string;
  loginRequired?: boolean; // Tambahkan properti opsional
}

export async function POST(req: NextRequest) {
  try {
    const { path, type, expiresIn, loginRequired }: ShareRequestBody = await req.json();
    
    if (!path || !type || !expiresIn) {
      return NextResponse.json({ error: 'Path, type, dan expiresIn diperlukan.' }, { status: 400 });
    }
    
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    
    // Simpan informasi loginRequired di dalam token
    const token = await new SignJWT({ path, loginRequired: loginRequired ?? false })
       .setProtectedHeader({ alg: 'HS256' })
       .setIssuedAt()
       .setExpirationTime(expiresIn)
       .sign(secret);

    const shareableUrl = `${req.nextUrl.origin}${path}?share_token=${token}`;

    return NextResponse.json({ shareableUrl });
  } catch (error) {
    console.error('Error generating share link:', error);
    return NextResponse.json({ error: 'Gagal membuat tautan berbagi.' }, { status: 500 });
  }
}