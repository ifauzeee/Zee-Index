// File: app/(main)/search/route.ts
import { NextResponse } from 'next/server';
import { getAccessToken, DriveFile } from '@/lib/googleDrive';
import { isProtected } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('q');
  // --- PERBAIKAN --- Ambil folderId dari parameter
  const folderId = searchParams.get('folderId');

  if (!searchTerm) {
    return NextResponse.json({ error: 'Search term is required.' }, { status: 400 });
  }

  try {
    const accessToken = await getAccessToken();
    const driveUrl = 'https://www.googleapis.com/drive/v3/files';

    // --- PERBAIKAN --- Bangun query secara dinamis
    let driveQuery = `name contains '${searchTerm}' and trashed=false`;
    if (folderId) {
      // Jika ada folderId, tambahkan kondisi 'in parents'
      // Ini akan mencari file/folder di dalam folderId yang ditentukan
      driveQuery += ` and '${folderId}' in parents`;
    }

    const params = new URLSearchParams({
      q: driveQuery,
      fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, hasThumbnail, parents)',
      pageSize: '100'
    });

    const response = await fetch(`${driveUrl}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Drive API Error: ${errorData.error.message}`);
    }

    const data = await response.json();
    
    const processedFiles = (data.files || []).map((file: DriveFile) => ({
      ...file,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      isProtected: file.mimeType === 'application/vnd.google-apps.folder' && isProtected(file.id),
    }));

    return NextResponse.json({ files: processedFiles });
  } catch (error: any) {
    console.error('Search API Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to perform search.', details: error.message },
      { status: 500 }
    );
  }
}