// lib/googleDrive.ts
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  createdTime: string;
  webViewLink: string;
  thumbnailLink?: string;
  hasThumbnail: boolean;
  isFolder: boolean;
  isProtected?: boolean;
  parents?: string[];
  owners?: { displayName: string; emailAddress: string }[];
  lastModifyingUser?: { displayName: string };
  md5Checksum?: string;
  imageMediaMetadata?: { width: number; height: number };
  videoMediaMetadata?: { width: number; height: number; durationMillis: string };
}

// Interface baru untuk breakdown penyimpanan
interface StorageBreakdown {
  type: string;
  count: number;
  size: number;
}

// Dideklarasikan di level atas agar dapat diakses
export async function getAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.error("Gagal mendapatkan Access Token:", errorData);
    throw new Error(`Otentikasi Gagal: ${errorData.error_description || 'Periksa konfigurasi .env.local Anda.'}`);
  }

  const tokenData: { access_token: string } = await response.json();
  return tokenData.access_token;
}

// Dideklarasikan di level atas agar dapat diakses
async function fetchAllFilesRecursively(accessToken: string, folderId: string): Promise<any[]> {
  let allFiles: any[] = [];
  let pageToken: string | null = null;
  const GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, parents)',
      pageSize: '1000',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await fetch(`${GOOGLE_DRIVE_API_URL}?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      console.error(`Gagal mengambil file dari folder ${folderId}`);
      break;
    }
    const data: { files?: any[], nextPageToken?: string | null } = await response.json();
    if (data.files) allFiles = allFiles.concat(data.files);
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);

  const subFolderPromises = allFiles
    .filter((file: any) => file.mimeType === 'application/vnd.google-apps.folder')
    .map((folder: any) => fetchAllFilesRecursively(accessToken, folder.id));

  const subFolderFilesArrays = await Promise.all(subFolderPromises);
  for (const subFolderFiles of subFolderFilesArrays) {
    allFiles = allFiles.concat(subFolderFiles);
  }
  return allFiles;
}

export async function listFilesFromDrive(folderId: string, pageToken?: string | null) {
  const accessToken = await getAccessToken();
  const GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, hasThumbnail, parents)',
    orderBy: 'folder, name',
    pageSize: '1000',
  });
  if (pageToken) {
    params.append('pageToken', pageToken);
  }

  const response = await fetch(`${GOOGLE_DRIVE_API_URL}?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Google Drive API Error:", errorData);
    throw new Error(`Google Drive API Error: ${errorData.error?.message || 'Pastikan folder ID benar dan dapat diakses.'}`);
  }

  const data: { files: any[], nextPageToken?: string | null } = await response.json();
  const processedFiles: DriveFile[] = (data.files || []).map((file: any) => ({
    ...file,
    isFolder: file.mimeType === 'application/vnd.google-apps.folder',
  }));

  return {
    files: processedFiles,
    nextPageToken: data.nextPageToken || null,
  };
}

export async function getFileDetailsFromDrive(fileId: string): Promise<DriveFile | null> {
  const accessToken = await getAccessToken();
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const params = new URLSearchParams({
    fields: 'id, name, mimeType, size, modifiedTime, createdTime, webViewLink, thumbnailLink, hasThumbnail, parents, owners(displayName, emailAddress), lastModifyingUser(displayName), md5Checksum, imageMediaMetadata(width, height), videoMediaMetadata(width, height, durationMillis)'
  });
  const response = await fetch(`${driveUrl}?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    console.error(`Gagal mengambil detail untuk file ID: ${fileId}`);
    return null;
  }

  const data: any = await response.json();
  return {
    ...data,
    isFolder: data.mimeType === 'application/vnd.google-apps.folder',
  };
}

export async function getFolderPath(folderId: string): Promise<{ id: string; name: string }[]> {
  const accessToken = await getAccessToken();
  const path = [];
  let currentId = folderId;
  const rootId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
  while (currentId && currentId !== rootId) {
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${currentId}`;
    const params = new URLSearchParams({ fields: 'id, name, parents' });
    const response = await fetch(`${driveUrl}?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store'
    });
    if (!response.ok) {
      console.error(`Gagal mengambil detail untuk folder ID: ${currentId}`);
      break;
    }
    const data: { id: string, name: string, parents?: string[] } = await response.json();
    path.unshift({ id: data.id, name: data.name });
    if (data.parents && data.parents.length > 0) {
      currentId = data.parents[0];
    } else {
      break;
    }
  }
  return path;
}

export async function getStorageDetails() {
  const accessToken = await getAccessToken();
  const aboutResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!aboutResponse.ok) {
    throw new Error('Gagal mengambil data kuota Google Drive.');
  }
  const aboutData: { storageQuota: { usage: string, limit: string } } = await aboutResponse.json();
  const usage = parseInt(aboutData.storageQuota.usage, 10);
  const limit = parseInt(aboutData.storageQuota.limit, 10);
  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;
  const allFiles = await fetchAllFilesRecursively(accessToken, rootFolderId);
  const largestFiles = allFiles
    .filter((file: DriveFile) => file.mimeType !== 'application/vnd.google-apps.folder' && file.size)
    .sort((a: DriveFile, b: DriveFile) => parseInt(b.size!, 10) - parseInt(a.size!, 10))
    .slice(0, 10)
    .map((file: DriveFile) => ({...file, isFolder: false}));
  const breakdown = allFiles.reduce((acc: Record<string, { count: number, size: number }>, file: DriveFile) => {
    if (file.mimeType !== 'application/vnd.google-apps.folder' && file.size) {
      const size = parseInt(file.size, 10);
      let type = 'Lainnya';
      if (file.mimeType.startsWith('image/')) type = 'Gambar';
      else if (file.mimeType.startsWith('video/')) type = 'Video';
      else if (file.mimeType.startsWith('audio/')) type = 'Audio';
      else if (file.mimeType === 'application/pdf') type = 'Dokumen';
      else if (file.mimeType.startsWith('application/vnd.google-apps')) type = 'Google Docs';

      if (!acc[type]) {
        acc[type] = { count: 0, size: 0 };
      }
      acc[type].count += 1;
      acc[type].size += size;
    }
    return acc;
  }, {} as Record<string, { count: number, size: number }>);
  const formattedBreakdown: StorageBreakdown[] = Object.entries(breakdown)
    .map(([type, data]) => ({ type, count: data.count, size: data.size }))
    .sort((a: StorageBreakdown, b: StorageBreakdown) => b.size - a.size);
  return {
    usage,
    limit,
    breakdown: formattedBreakdown,
    largestFiles,
  };
}