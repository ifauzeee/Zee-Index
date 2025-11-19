import { kv } from "@/lib/kv";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  createdTime: string;
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
  hasThumbnail: boolean;
  isFolder: boolean;
  isProtected?: boolean;
  parents?: string[];
  owners?: { displayName: string; emailAddress: string }[];
  lastModifyingUser?: { displayName: string };
  md5Checksum?: string;
  imageMediaMetadata?: { width: number; height: number };
  videoMediaMetadata?: {
    width: number;
    height: number;
    durationMillis: string;
  };
  trashed: boolean;
}

interface StorageBreakdown {
  type: string;
  count: number;
  size: number;
}

const ACCESS_TOKEN_KEY = "google:access-token";

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 1000,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      if (response.status >= 400 && response.status < 500) {
        return response;
      }
    } catch (error: any) {
      if (i === retries - 1) throw error;
      console.log(
        `Fetch gagal (percobaan ${
          i + 1
        }/${retries}), mencoba lagi dalam ${delay / 1000} detik...`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error("Gagal melakukan fetch setelah beberapa kali percobaan.");
}

export async function getAccessToken(): Promise<string> {
  try {
    const cachedToken: string | null = await kv.get(ACCESS_TOKEN_KEY);
    if (cachedToken) {
      return cachedToken;
    }
  } catch (e) {
    console.error("Gagal mengambil token dari cache:", e);
  }

  const url = "https://oauth2.googleapis.com/token";
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    cache: "no-store" as RequestCache,
  };
  const response = await fetchWithRetry(url, options);

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Gagal mendapatkan Access Token:", errorData);
    throw new Error(
      `Otentikasi Gagal: ${
        errorData.error_description || "Periksa konfigurasi .env.local Anda."
      }`,
    );
  }

  const tokenData: { access_token: string; expires_in: number } =
    await response.json();
  try {
    await kv.set(ACCESS_TOKEN_KEY, tokenData.access_token, { ex: 3000 });
  } catch (e) {
    console.error("Gagal menyimpan token ke cache:", e);
  }

  return tokenData.access_token;
}

export async function getAllDescendantFolders(
  accessToken: string,
  rootFolderId: string,
): Promise<string[]> {
  const cacheKey = `zee-index:folder-tree:${rootFolderId}`;
  try {
    const cachedTree: string[] | null = await kv.get(cacheKey);
    if (cachedTree) {
      console.log("Menggunakan folder tree dari cache.");
      return cachedTree;
    }
  } catch (e) {
    console.error("Gagal mengambil folder tree dari cache:", e);
  }

  console.log("Membangun folder tree baru (tidak ada di cache).");
  const allFolderIds = new Set<string>([rootFolderId]);
  const queue: [string, number][] = [[rootFolderId, 0]];
  const GOOGLE_DRIVE_API_URL = "https://www.googleapis.com/drive/v3/files";
  const MAX_DEPTH = 10;

  while (queue.length > 0) {
    const [folderId, depth] = queue.shift()!;

    if (depth >= MAX_DEPTH) {
      console.log(`Mencapai kedalaman maksimum (${MAX_DEPTH}) pada folder ${folderId}.`);
      continue;
    }

    let pageToken: string | null = null;

    do {
      const params = new URLSearchParams({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "nextPageToken, files(id)",
        pageSize: "1000",
      });
      if (pageToken) params.set("pageToken", pageToken);

      try {
        const response = await fetchWithRetry(
          `${GOOGLE_DRIVE_API_URL}?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
          },
        );
        if (!response.ok) {
          console.error(`Gagal mengambil subfolder dari folder ${folderId}`);
          break;
        }

        const data: {
          files?: { id: string }[];
          nextPageToken?: string | null;
        } = await response.json();

        if (data.files) {
          for (const folder of data.files) {
            if (!allFolderIds.has(folder.id)) {
              allFolderIds.add(folder.id);
              queue.push([folder.id, depth + 1]);
            }
          }
        }
        pageToken = data.nextPageToken ?? null;
      } catch (error) {
        console.error(
          `Error saat fetching subfolder untuk ${folderId}:`,
          error,
        );
        pageToken = null;
      }
    } while (pageToken);
  }
  const folderArray = Array.from(allFolderIds);
  try {
    await kv.set(cacheKey, folderArray, { ex: 3600 });
  } catch (e) {
    console.error("Gagal menyimpan folder tree ke cache:", e);
  }

  return folderArray;
}

export async function listFilesFromDrive(
  folderId: string,
  pageToken?: string | null,
  pageSize: number = 50,
) {
  const accessToken = await getAccessToken();
  const GOOGLE_DRIVE_API_URL = "https://www.googleapis.com/drive/v3/files";
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields:
      "nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, thumbnailLink, hasThumbnail, parents, trashed)",
    orderBy: "folder, name",
    pageSize: String(pageSize),
  });
  if (pageToken) {
    params.append("pageToken", pageToken);
  }

  const response = await fetchWithRetry(
    `${GOOGLE_DRIVE_API_URL}?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const errorData = await response.json();
    console.error("Google Drive API Error:", errorData);
    throw new Error(
      `Google Drive API Error: ${
        errorData.error?.message || "Pastikan folder ID benar dan dapat diakses."
      }`,
    );
  }

  const data: { files: any[]; nextPageToken?: string | null } =
    await response.json();
  const processedFiles: DriveFile[] = (data.files || []).map((file: any) => ({
    ...file,
    isFolder: file.mimeType === "application/vnd.google-apps.folder",
  }));
  return {
    files: processedFiles,
    nextPageToken: data.nextPageToken || null,
  };
}

export async function getFileDetailsFromDrive(
  fileId: string,
): Promise<DriveFile | null> {
  const accessToken = await getAccessToken();
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const params = new URLSearchParams({
    fields:
      "id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, thumbnailLink, hasThumbnail, parents, owners(displayName, emailAddress), lastModifyingUser(displayName), md5Checksum, imageMediaMetadata(width, height), videoMediaMetadata(width, height, durationMillis), trashed",
  });
  const response = await fetchWithRetry(`${driveUrl}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    console.error(`Gagal mengambil detail untuk file ID: ${fileId}`);
    return null;
  }

  const data: any = await response.json();
  return {
    ...data,
    isFolder: data.mimeType === "application/vnd.google-apps.folder",
  };
}

export async function getFolderPath(
  folderId: string,
): Promise<{ id: string; name: string }[]> {
  const cacheKey = `zee-index:folder-path:${folderId}`;
  try {
    const cachedPath: { id: string; name: string }[] | null =
      await kv.get(cacheKey);
    if (cachedPath) {
      console.log(`Menggunakan path folder dari cache untuk: ${folderId}`);
      return cachedPath;
    }
  } catch (e) {
    console.error("Gagal mengambil path dari cache:", e);
  }

  const accessToken = await getAccessToken();
  const path = [];
  let currentId = folderId;
  const rootId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
  if (folderId === rootId) {
    path.unshift({ id: rootId, name: "Home" });
  } else {
    while (currentId && currentId !== rootId) {
      const driveUrl = `https://www.googleapis.com/drive/v3/files/${currentId}`;
      const params = new URLSearchParams({ fields: "id, name, parents" });
      const response = await fetchWithRetry(
        `${driveUrl}?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        },
      );
      if (!response.ok) {
        console.error(`Gagal mengambil detail untuk folder ID: ${currentId}`);
        break;
      }

      const data: { id: string; name: string; parents?: string[] } =
        await response.json();
      path.unshift({ id: data.id, name: data.name });
      if (data.parents && data.parents.length > 0) {
        currentId = data.parents[0];
      } else {
        break;
      }
    }
  }

  try {
    await kv.set(cacheKey, path, { ex: 3600 });
  } catch (e) {
    console.error("Gagal menyimpan path ke cache:", e);
  }

  return path;
}

export async function getStorageDetails() {
  const accessToken = await getAccessToken();
  const GOOGLE_DRIVE_API_URL = "https://www.googleapis.com/drive/v3";

  const aboutResponse = await fetchWithRetry(
    `${GOOGLE_DRIVE_API_URL}/about?fields=storageQuota`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  if (!aboutResponse.ok) {
    throw new Error("Gagal mengambil data kuota Google Drive.");
  }
  const aboutData: { storageQuota: { usage: string; limit: string } } =
    await aboutResponse.json();

  const usage = parseInt(aboutData.storageQuota.usage, 10);
  const limit = parseInt(aboutData.storageQuota.limit, 10);

  const largestFilesParams = new URLSearchParams({
    q: "trashed=false and mimeType != 'application/vnd.google-apps.folder'",
    orderBy: "quotaBytesUsed desc",
    pageSize: "10",
    fields:
      "files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, hasThumbnail, parents, trashed)",
  });

  const largestFilesResponse = await fetchWithRetry(
    `${GOOGLE_DRIVE_API_URL}/files?${largestFilesParams.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!largestFilesResponse.ok) {
    throw new Error("Gagal mengambil data file terbesar.");
  }

  const largestFilesData = await largestFilesResponse.json();
  const largestFiles = (largestFilesData.files || []).map((file: any) => ({
    ...file,
    isFolder: file.mimeType === "application/vnd.google-apps.folder",
  }));

  return {
    usage,
    limit,
    breakdown: [],
    largestFiles,
  };
}

export async function searchFilesInFolder(
  accessToken: string,
  folderId: string,
  searchTerm: string,
  queryField: string,
  mimeQuery: string,
  dateQuery: string,
): Promise<DriveFile[]> {
  const GOOGLE_DRIVE_API_URL = "https://www.googleapis.com/drive/v3/files";
  let driveQuery = `${queryField} contains '${searchTerm}' and trashed=false`;
  driveQuery += ` and '${folderId}' in parents`;
  driveQuery += mimeQuery;
  driveQuery += dateQuery;

  const params = new URLSearchParams({
    q: driveQuery,
    fields:
      "files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, thumbnailLink, hasThumbnail, parents)",
    pageSize: "1000",
  });
  const response = await fetchWithRetry(
    `${GOOGLE_DRIVE_API_URL}?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    console.error(
      `Gagal mencari di folder ${folderId}:`,
      await response.json(),
    );
    return [];
  }

  const data = await response.json();
  return (data.files || []) as DriveFile[];
}