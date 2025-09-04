// File: app/(main)/api/search/route.ts
import { NextResponse } from 'next/server';
import { getAccessToken, DriveFile } from '@/lib/googleDrive';
import { isProtected } from '@/lib/auth';

// Fungsi helper untuk mendapatkan semua ID subfolder secara rekursif
async function getAllValidParentIds(accessToken: string, targetFolderId: string): Promise<Set<string>> {
  const allFolderIds = new Set<string>();
  const queue = [targetFolderId];
  allFolderIds.add(targetFolderId);

  while (queue.length > 0) {
    const currentFolderId = queue.shift()!;
    let pageToken: string | null = null;
    do {
      const params = new URLSearchParams({
        q: `'${currentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'nextPageToken, files(id)',
        pageSize: '1000',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error(`Gagal mengambil subfolder dari folder ${currentFolderId}`);
        break;
      }
      const data: { files?: any[], nextPageToken?: string | null } = await response.json();
      if (data.files) {
        data.files.forEach(file => {
          if (!allFolderIds.has(file.id)) {
            allFolderIds.add(file.id);
            queue.push(file.id);
          }
        });
      }
      pageToken = data.nextPageToken ?? null;
    } while (pageToken);
  }
  return allFolderIds;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('q');
  const folderId = searchParams.get('folderId');

  if (!searchTerm) {
    return NextResponse.json({ error: 'Search term is required.' }, { status: 400 });
  }

  try {
    const accessToken = await getAccessToken();
    const driveUrl = 'https://www.googleapis.com/drive/v3/files';
    
    // Lakukan pencarian awal di seluruh drive, tanpa batasan folder
    const params = new URLSearchParams({
      q: `name contains '${searchTerm}' and trashed=false`,
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
    const allFiles = data.files || [];

    let filteredFiles: DriveFile[] = allFiles;

    // Jika ada folderId, lakukan filtering di sisi server
    if (folderId) {
        // Mendapatkan semua ID folder dan subfolder yang valid
        const validFolderIds = await getAllValidParentIds(accessToken, folderId);
        
        // Memfilter file: file harus memiliki parent yang ada di dalam set validFolderIds
        filteredFiles = allFiles.filter((file: DriveFile) => { // <-- Perbaikan di sini
            if (!file.parents || file.parents.length === 0) {
                return false;
            }
            return file.parents.some((parentId: string) => validFolderIds.has(parentId));
        });
    }

    const processedFiles = filteredFiles.map((file: DriveFile) => ({ // <-- dan di sini
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