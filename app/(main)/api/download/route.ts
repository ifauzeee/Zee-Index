

import { NextResponse, type NextRequest } from 'next/server';
import { getAccessToken, getFileDetailsFromDrive } from '@/lib/googleDrive';
import { jwtVerify } from 'jose';
import { kv } from '@/lib/kv';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { logActivity } from '@/lib/activityLogger';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');
  const shareToken = searchParams.get('share_token');
  
  let isShareTokenValid = false;

  if (shareToken) {
    try {
      const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
      const { payload } = await jwtVerify(shareToken, secret);
      const isBlocked = await kv.get(`zee-index:blocked:${payload.jti}`);
      if (isBlocked) throw new Error('Tautan ini telah dibatalkan.');
      isShareTokenValid = true;
    } catch (error) {
      console.error("Verifikasi share token gagal:", error);
    }
  }

  if (!session && !isShareTokenValid) {
    return NextResponse.json({ error: 'Akses ditolak. Diperlukan autentikasi.' }, { status: 401 });
  }

  if (!fileId) {
    return NextResponse.json({ error: 'Parameter fileId tidak ditemukan.' }, { status: 400 });
  }
  
  try {
    const accessToken = await getAccessToken();
    const fileDetails = await getFileDetailsFromDrive(fileId);

    if (!fileDetails || !fileDetails.size) {
        return NextResponse.json({ error: 'File tidak ditemukan atau ukurannya tidak diketahui.' }, { status: 404 });
    }

    
    await logActivity('DOWNLOAD', {
        itemName: fileDetails.name,
        itemSize: fileDetails.size,
        userEmail: session?.user?.email, 
    });
    

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const fileSize = parseInt(fileDetails.size, 10);
    
    const range = request.headers.get('range');
    const headers = new Headers({
        'Authorization': `Bearer ${accessToken}`,
    });

    if (range) {
      headers.set('Range', range);
      const driveResponse = await fetch(driveUrl, { headers });
      const partialBody = driveResponse.body;
      const contentRange = driveResponse.headers.get('Content-Range');

      const responseHeaders = new Headers();
      if (contentRange) {
         responseHeaders.set('Content-Range', contentRange);
      }
      responseHeaders.set('Accept-Ranges', 'bytes');
      responseHeaders.set('Content-Length', driveResponse.headers.get('Content-Length') || '');
      responseHeaders.set('Content-Type', fileDetails.mimeType);

      return new NextResponse(partialBody, { status: 206, headers: responseHeaders });
    } else {
      const driveResponse = await fetch(driveUrl, { headers });
      const body = driveResponse.body;
      
      const responseHeaders = new Headers();
      const fileName = fileDetails.name || 'download';
      responseHeaders.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      responseHeaders.set('Content-Type', fileDetails.mimeType);
      responseHeaders.set('Content-Length', String(fileSize));

      return new NextResponse(body, { status: 200, headers: responseHeaders });
    }
  } catch (error: any) {
    console.error('Download API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}