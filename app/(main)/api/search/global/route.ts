// File: app/(main)/api/search/global/route.ts
import { NextResponse } from 'next/server';
import { getAccessToken, DriveFile } from '@/lib/googleDrive'; // Pastikan DriveFile di-import
import { isProtected } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Fungsi helper ini tidak perlu diubah
async function isDescendant(fileId: string, rootId: string, accessToken: string): Promise<boolean> {
  if (!fileId || fileId === rootId) {
    return false;
  }
  
  let currentId = fileId;
  
  const detailsResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${currentId}?fields=parents`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!detailsResponse.ok) return false;
  const details = await detailsResponse.json();
  if (!details.parents || details.parents.length === 0) return false;

  let parentId = details.parents[0];
  const visited = new Set();

  while (parentId && !visited.has(parentId)) {
    if (parentId === rootId) {
      return true;
    }
    visited.add(parentId);
    
    const parentResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${parentId}?fields=parents`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!parentResponse.ok) break;
    const parentDetails = await parentResponse.json();
    parentId = parentDetails.parents?.[0];
  }
  
  return false;
}

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
    
    const driveQuery = `name contains '${searchTerm}' and trashed=false`;

    const params = new URLSearchParams({
      q: driveQuery,
      fields: 'files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, thumbnailLink, hasThumbnail, parents)',
      pageSize: '100',
    });

    const response = await fetch(`${driveUrl}?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
       const errorData = await response.json();
       throw new Error(`Google Drive API Error: ${errorData.error.message}`);
    }

    const data = await response.json();
    const allFoundFiles = data.files || [];

    // Filter hasil untuk hanya menyertakan file di dalam rootFolderId
    // MODIFIKASI: Tambahkan tipe DriveFile di sini untuk mengatasi error 'implicit any'
    const descendantCheckPromises = allFoundFiles.map((file: DriveFile) => 
      isDescendant(file.id, rootFolderId, accessToken)
        .then(isDesc => (isDesc ? file : null))
    );

    const filteredFilesRaw = await Promise.all(descendantCheckPromises);
    const filteredFiles = filteredFilesRaw.filter(Boolean);
    
    const processedFiles = filteredFiles.map((file: DriveFile) => ({
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