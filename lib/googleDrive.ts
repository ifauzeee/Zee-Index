// C:/Users/Ibnu/zee/Project/zee-index-nextjs/lib/googleDrive.ts

import { google } from 'googleapis';
import { revalidateTag } from 'next/cache';

// Definisikan tipe untuk file Drive agar lebih mudah dikelola
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  hasThumbnail?: boolean;
  isFolder: boolean;
}

// Interface untuk mendefinisikan bentuk respons dari Google Drive API
interface GDriveFilesListResponse {
  files: any[];
  nextPageToken?: string;
}

// Interface untuk data penggunaan penyimpanan
export interface StorageDetails {
    limit: string;
    usage: string;
    usageInDrive: string;
    usageInDriveTrash: string;
}

// Interface untuk item dalam folder path (breadcrumb)
export interface FolderPathItem {
    id: string;
    name: string;
}

// Fungsi untuk mendapatkan token akses OAuth 2.0
// PERBAIKAN 1: Menambahkan 'export' agar bisa digunakan di file lain
export async function getAccessToken() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  try {
    const { token } = await oauth2Client.getAccessToken();
    if (!token) {
      throw new Error('Failed to retrieve access token.');
    }
    return token;
  } catch (error: any) {
    console.error('Error getting access token:', error.message);
    throw new Error('Could not get access token.');
  }
}

// Fungsi untuk mendapatkan jalur folder (breadcrumb)
export async function getFolderPath(folderId: string): Promise<FolderPathItem[]> {
    let path: FolderPathItem[] = [];
    let currentId = folderId;
    const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;

    try {
        const accessToken = await getAccessToken();

        while (currentId && currentId !== rootFolderId) {
            const driveUrl = `https://www.googleapis.com/drive/v3/files/${currentId}`;
            const params = new URLSearchParams({
                fields: 'id,name,parents',
            });

            const response = await fetch(`${driveUrl}?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
                next: { revalidate: 3600, tags: [`folder-path-${currentId}`] }
            });

            if (!response.ok) {
                 console.error(`Could not fetch details for folder ${currentId}`);
                 break;
            }

            const file = await response.json();
            path.unshift({ id: file.id, name: file.name });

            if (file.parents && file.parents.length > 0) {
                currentId = file.parents[0];
            } else {
                break;
            }
        }

        path.unshift({ id: rootFolderId!, name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || 'Beranda' });

        return path;

    } catch (error: any) {
        console.error('Failed to get folder path:', error.message);
        throw new Error('Could not get folder path from Google Drive.');
    }
}


// Fungsi untuk mendapatkan detail penggunaan penyimpanan
export async function getStorageDetails(): Promise<StorageDetails> {
    try {
        const accessToken = await getAccessToken();
        const aboutUrl = 'https://www.googleapis.com/drive/v3/about';

        const params = new URLSearchParams({
            fields: 'storageQuota'
        });

        const response = await fetch(`${aboutUrl}?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            next: { revalidate: 3600, tags: ['storage'] }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google Drive API Error: ${(errorData as { error: { message: string } }).error.message}`);
        }

        const data = await response.json();
        return data.storageQuota;

    } catch (error: any) {
        console.error('Failed to get storage details:', error.message);
        throw new Error('Could not get storage details from Google Drive.');
    }
}


// Fungsi untuk mengambil daftar file dari folder tertentu di Google Drive
export async function listFilesFromDrive(
  folderId: string,
  pageToken?: string | null
): Promise<{ files: DriveFile[]; nextPageToken: string | null }> {
  try {
    const accessToken = await getAccessToken();
    const driveUrl = 'https://www.googleapis.com/drive/v3/files';

    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields:
        'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, hasThumbnail)',
      pageSize: '100',
      orderBy: 'folder,name',
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const response = await fetch(`${driveUrl}?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      next: { revalidate: 3600, tags: ['files'] },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Drive API Error: ${(errorData as { error: { message: string } }).error.message}`);
    }

    const data: GDriveFilesListResponse = await response.json();

    const files: DriveFile[] = (data.files || []).map((file: any) => ({
      ...file,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    }));

    return {
      files,
      nextPageToken: data.nextPageToken || null,
    };
  } catch (error: any) {
    console.error('Failed to list files from Drive:', error.message);
    throw new Error('Could not list files from Google Drive.');
  }
}

// Fungsi untuk mendapatkan detail file berdasarkan ID
// PERBAIKAN 2: Mengganti nama fungsi agar sesuai dengan yang diimpor
export async function getFileDetailsFromDrive(fileId: string): Promise<DriveFile> {
  try {
    const accessToken = await getAccessToken();
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    
    const params = new URLSearchParams({
        fields: 'id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, hasThumbnail',
    });

    const response = await fetch(`${driveUrl}?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        next: { revalidate: 3600, tags: [`file-${fileId}`] }
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Drive API Error: ${(errorData as { error: { message: string } }).error.message}`);
    }

    const fileData = await response.json();
    return {
        ...fileData,
        isFolder: fileData.mimeType === 'application/vnd.google-apps.folder',
    };
  } catch (error: any) {
      console.error(`Failed to get file details for ${fileId}:`, error.message);
      throw new Error('Could not get file details from Google Drive.');
  }
}

// Fungsi untuk mendapatkan konten file
export async function getFileContent(fileId: string): Promise<Response> {
    try {
        const accessToken = await getAccessToken();
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
        
        const params = new URLSearchParams({ alt: 'media' });

        const response = await fetch(`${driveUrl}?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            next: { revalidate: 3600, tags: [`file-content-${fileId}`] }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google Drive API Error: ${(errorData as { error: { message: string } }).error.message}`);
        }
        
        return response;
    } catch (error: any) {
        console.error(`Failed to download file ${fileId}:`, error.message);
        throw new Error('Could not download file from Google Drive.');
    }
}

// Fungsi untuk revalidasi tag Next.js cache
export async function revalidateFiles() {
  revalidateTag('files');
}

// Helper untuk menentukan tipe file
export function getFileType(file: DriveFile): string {
  if (file.isFolder) return 'folder';
  const mime = file.mimeType;
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  const codeMimes = ['text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json', 'text/markdown'];
  if (codeMimes.includes(mime) || (file.name && file.name.match(/\.(js|ts|json|py|css|html|md|txt)$/))) return 'code';
  return 'other';
}

// Helper untuk mendapatkan ikon berdasarkan tipe file
export function getIcon(file: DriveFile): string {
  if (file.isFolder) return 'fa-folder text-[color:var(--icon-folder-color)]';
  const mime = file.mimeType;
  if (mime.startsWith('image/')) return 'fa-file-image text-[color:var(--icon-image-color)]';
  if (mime.startsWith('video/')) return 'fa-file-video text-[color:var(--icon-video-color)]';
  if (mime.startsWith('audio/')) return 'fa-file-audio text-[color:var(--icon-audio-color)]';
  if (mime === 'application/pdf') return 'fa-file-pdf text-[color:var(--icon-pdf-color)]';
  if (getFileType(file) === 'code') return 'fa-file-code text-[color:var(--icon-code-color)]';
  if (mime.startsWith('application/vnd.google-apps')) return 'fa-google-drive text-[color:var(--icon-drive-color)]';
  return 'fa-file text-[color:var(--icon-other-color)]';
}