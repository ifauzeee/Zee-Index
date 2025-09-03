// app/api/download/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getAccessToken, getFileDetailsFromDrive } from '@/lib/googleDrive';
import { jwtVerify } from 'jose';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');
  const shareToken = searchParams.get('share_token');

  if (!fileId) {
    return NextResponse.json({ error: 'Parameter fileId tidak ditemukan.' }, { status: 400 });
  }

  if (shareToken) {
    try {
      const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
      const { payload } = await jwtVerify(shareToken, secret);
      // Anda mungkin ingin memeriksa `payload.path` untuk memastikan token ini untuk file yang benar
    } catch (error) {
      console.error("Verifikasi share token gagal:", error);
      return NextResponse.json({ error: 'Tautan berbagi tidak valid atau kedaluwarsa.' }, { status: 401 });
    }
  }

  try {
    const accessToken = await getAccessToken();
    const fileDetails = await getFileDetailsFromDrive(fileId);

    if (!fileDetails || !fileDetails.size) {
        return NextResponse.json({ error: 'File tidak ditemukan atau ukurannya tidak diketahui.' }, { status: 404 });
    }

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const fileSize = parseInt(fileDetails.size, 10);
    
    const range = request.headers.get('range');
    const headers = new Headers({
        'Authorization': `Bearer ${accessToken}`,
    });

    if (range) {
      headers.set('Range', range);
      const driveResponse = await fetch(driveUrl, { headers });
      const partialBody = await driveResponse.body;
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
      const body = await driveResponse.body;
      
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