// File: app/(main)/api/search/global/route.ts

import { NextResponse } from 'next/server';
import { getAccessToken, DriveFile } from '@/lib/googleDrive';
import { isProtected } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('q');
  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;

  if (!searchTerm) {
    return NextResponse.json({ error: 'Search term is required.' }, { status: 400 });
  }

  if (!rootFolderId) {
    return NextResponse.json({ error: 'Root folder ID is not configured.' }, { status: 500 });
  }

  try {
    const accessToken = await getAccessToken();
    const driveUrl = 'https://www.googleapis.com/drive/v3/files';

    // Query untuk mencari di seluruh Drive, tapi bisa kita persempit
    // agar hanya mencari file yang 'terlihat' dari root kita (meski tidak rekursif sempurna di API)
    // Untuk implementasi sederhana, kita cari secara global lalu filter.
    // Atau, cara yang lebih mudah: cari file yang namanya cocok DAN BUKAN folder root itu sendiri.
    const driveQuery = `name contains '${searchTerm}' and trashed=false and '${rootFolderId}' in parents`;

    const params = new URLSearchParams({
      q: `name contains '${searchTerm}' and trashed=false`, // Pencarian global untuk nama file
      fields: 'files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, thumbnailLink, hasThumbnail, parents)',
      pageSize: '100', // Batasi hasil agar tidak terlalu banyak
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
    console.error('Global Search API Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to perform global search.', details: error.message },
      { status: 500 }
    );
  }
}