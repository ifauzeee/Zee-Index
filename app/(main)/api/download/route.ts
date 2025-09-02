// app/api/download/route.ts
import { NextResponse } from 'next/server';
import { getAccessToken, getFileDetailsFromDrive } from '@/lib/googleDrive';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'Parameter fileId tidak ditemukan.' }, { status: 400 });
  }

  try {
    const accessToken = await getAccessToken();
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const fileDetails = await getFileDetailsFromDrive(fileId);

    if (!fileDetails) {
        return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 404 });
    }

    const driveResponse = await fetch(driveUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!driveResponse.ok) {
      return NextResponse.json(
        { error: 'Gagal mengunduh file dari Google Drive.' },
        { status: driveResponse.status }
      );
    }
    
    const responseHeaders = new Headers(driveResponse.headers);
    const fileName = fileDetails.name || 'download';
    responseHeaders.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    responseHeaders.set('Cache-Control', 'public, max-age=604800, immutable');

    return new NextResponse(driveResponse.body, { status: driveResponse.status, headers: responseHeaders });
  } catch (error: any) {
    console.error('Download API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}