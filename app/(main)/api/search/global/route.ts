import { NextResponse } from 'next/server';
import { getAccessToken, DriveFile, getAllDescendantFolders } from '@/lib/googleDrive';
import { isProtected } from '@/lib/auth';

const sanitizeString = (str: string) => str.replace(/<[^>]*>?/gm, '');

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSearchTerm = searchParams.get('q');
  const searchType = searchParams.get('searchType') || 'name';
  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;

  if (!rawSearchTerm) {
    return NextResponse.json({ error: 'Search term is required.' }, { status: 400 });
  }
  if (!rootFolderId) {
    return NextResponse.json({ error: 'Root folder ID is not configured.' }, { status: 500 });
  }
  
  const sanitizedSearchTerm = sanitizeString(rawSearchTerm);
  const searchTerm = sanitizedSearchTerm.replace(/'/g, "''");
  
  try {
    const accessToken = await getAccessToken();
    const descendantFolderIds = await getAllDescendantFolders(accessToken, rootFolderId);
    const parentQueries = descendantFolderIds.map(id => `'${id}' in parents`);
    
    const queryField = searchType === 'fullText' ? 'fullText' : 'name';
    const driveQuery = `${queryField} contains '${searchTerm}' and trashed=false and (${parentQueries.join(' or ')})`;

    const driveUrl = 'https://www.googleapis.com/drive/v3/files';
    const params = new URLSearchParams({
      q: driveQuery,
      fields: 'files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, thumbnailLink, hasThumbnail, parents)',
      pageSize: '200', 
    });
    
    const response = await fetch(`${driveUrl}?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
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