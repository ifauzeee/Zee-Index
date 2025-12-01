import { getAppCredentials } from "@/lib/config";
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

export interface DriveRevision {
  id: string;
  modifiedTime: string;
  keepForever: boolean;
  size: string;
  originalFilename: string;
  lastModifyingUser?: { displayName: string };
}

export interface SharedDrive {
  id: string;
  name: string;
  kind: string;
  backgroundImageLink?: string;
}

interface DriveListResponse {
  files?: DriveFile[];
  nextPageToken?: string | null;
  error?: { message: string };
}

const ACCESS_TOKEN_KEY = "google:access-token";

export async function invalidateAccessToken() {
  await kv.del(ACCESS_TOKEN_KEY);
}

export async function getAccessToken(): Promise<string> {
  try {
    const cachedToken: string | null = await kv.get(ACCESS_TOKEN_KEY);
    if (cachedToken) {
      return cachedToken;
    }
  } catch (e) {
    console.error(e);
  }

  const creds = await getAppCredentials();
  if (!creds) {
    throw new Error(
      "Aplikasi belum dikonfigurasi. Silakan jalankan Setup Wizard.",
    );
  }

  const url = "https://oauth2.googleapis.com/token";
  const bodyParams = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: bodyParams,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(errorData);

    if (errorData.error === "invalid_grant") {
      await kv.del("zee-index:credentials");
      throw new Error(
        "Sesi Google Drive kadaluarsa. Silakan lakukan Setup ulang di /setup",
      );
    }

    throw new Error(errorData.error_description || "Otentikasi Gagal");
  }

  const tokenData: { access_token: string; expires_in: number } =
    await response.json();

  try {
    await kv.set(ACCESS_TOKEN_KEY, tokenData.access_token, { ex: 3500 });
  } catch (e) {
    console.error(e);
  }

  return tokenData.access_token;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 5,
  delay = 1000,
): Promise<Response> {
  const originalHeaders = new Headers(options.headers);

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status === 404) {
        return response;
      }

      if (response.status === 401) {
        await invalidateAccessToken();
        const newToken = await getAccessToken();
        originalHeaders.set("Authorization", `Bearer ${newToken}`);
        options.headers = originalHeaders;
        continue;
      }

      if (response.status === 429 || response.status >= 500) {
        await new Promise((res) => setTimeout(res, delay * Math.pow(2, i)));
        continue;
      }

      return response;
    } catch (error: unknown) {
      if (i === retries - 1) throw error;
      await new Promise((res) => setTimeout(res, delay * Math.pow(2, i)));
    }
  }
  throw new Error("Gagal melakukan fetch setelah beberapa kali percobaan.");
}

export async function listSharedDrives(): Promise<SharedDrive[]> {
  const accessToken = await getAccessToken();
  const url = "https://www.googleapis.com/drive/v3/drives?pageSize=100";

  const response = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.drives || [];
}

export async function getAllDescendantFolders(
  accessToken: string,
  rootFolderId: string,
): Promise<string[]> {
  const cacheKey = `zee-index:folder-tree-v2:${rootFolderId}`;
  try {
    const cachedTree: string[] | null = await kv.get(cacheKey);
    if (cachedTree) {
      return cachedTree;
    }
  } catch (e) {
    console.error(e);
  }

  const allFolderIds = new Set<string>([rootFolderId]);
  const queue: [string, number][] = [[rootFolderId, 0]];
  const GOOGLE_DRIVE_API_URL = "https://www.googleapis.com/drive/v3/files";
  const MAX_DEPTH = 10;

  while (queue.length > 0) {
    const [folderId, depth] = queue.shift()!;
    if (depth >= MAX_DEPTH) {
      continue;
    }

    let pageToken: string | null = null;
    do {
      const params = new URLSearchParams({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "nextPageToken, files(id)",
        pageSize: "1000",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
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
      } catch {
        pageToken = null;
      }
    } while (pageToken);
  }
  const folderArray = Array.from(allFolderIds);
  try {
    await kv.set(cacheKey, folderArray, { ex: 3600 });
  } catch (e) {
    console.error(e);
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
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
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
    throw new Error(
      errorData.error?.message || "Pastikan folder ID benar dan dapat diakses.",
    );
  }

  const data: DriveListResponse = await response.json();

  const processedFiles: DriveFile[] = (data.files || []).map((file) => ({
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
  const cacheKey = `gdrive:file-details-v2:${fileId}`;
  try {
    const cachedDetails: DriveFile | null = await kv.get(cacheKey);
    if (cachedDetails) {
      return cachedDetails;
    }
  } catch (e) {
    console.error(`Gagal mengambil cache untuk file ${fileId}:`, e);
  }

  const accessToken = await getAccessToken();
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const params = new URLSearchParams({
    fields:
      "id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, thumbnailLink, hasThumbnail, parents, owners(displayName, emailAddress), lastModifyingUser(displayName), md5Checksum, imageMediaMetadata(width, height), videoMediaMetadata(width, height, durationMillis), trashed",
    supportsAllDrives: "true",
  });

  const response = await fetchWithRetry(`${driveUrl}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as DriveFile;
  const fileDetails = {
    ...data,
    isFolder: data.mimeType === "application/vnd.google-apps.folder",
  };

  try {
    await kv.set(cacheKey, fileDetails, { ex: 600 });
  } catch (e) {
    console.error(`Gagal mengatur cache untuk file ${fileId}:`, e);
  }

  return fileDetails;
}

export async function getFolderPath(
  folderId: string,
): Promise<{ id: string; name: string }[]> {
  const cacheKey = `zee-index:folder-path-v2:${folderId}`;
  try {
    const cachedPath: { id: string; name: string }[] | null =
      await kv.get(cacheKey);
    if (cachedPath) {
      return cachedPath;
    }
  } catch (e) {
    console.error(e);
  }

  const accessToken = await getAccessToken();
  const path: { id: string; name: string }[] = [];
  let currentId = folderId;
  const rootId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
  const rootName = process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || "Home";

  let iterations = 0;
  while (currentId && iterations < 20) {
    iterations++;

    if (currentId === rootId) {
      path.unshift({ id: rootId, name: rootName });
      break;
    }

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${currentId}`;
    const params = new URLSearchParams({
      fields: "id, name, parents",
      supportsAllDrives: "true",
    });

    try {
      const response = await fetchWithRetry(
        `${driveUrl}?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        },
      );

      if (!response.ok) {
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
    } catch (e) {
      console.error("Error fetching folder path segment:", e);
      break;
    }
  }

  try {
    await kv.set(cacheKey, path, { ex: 3600 });
  } catch (e) {
    console.error(e);
  }

  return path;
}

export async function getStorageDetails() {
  const accessToken = await getAccessToken();
  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
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
  const globalUsage = parseInt(aboutData.storageQuota.usage, 10);

  const envLimitGB = process.env.STORAGE_LIMIT_GB;
  const limit = envLimitGB
    ? parseInt(envLimitGB) * 1024 * 1024 * 1024
    : parseInt(aboutData.storageQuota.limit, 10);

  const largestFilesParams = new URLSearchParams({
    q: "trashed=false and mimeType != 'application/vnd.google-apps.folder'",
    orderBy: "quotaBytesUsed desc",
    pageSize: "1000",
    fields:
      "files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, hasThumbnail, parents, trashed)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
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
  let rawFiles = (largestFilesData.files || []) as DriveFile[];

  if (rootFolderId) {
    const descendantFolderIds = await getAllDescendantFolders(
      accessToken,
      rootFolderId,
    );
    const validParentIds = new Set(descendantFolderIds);
    validParentIds.add(rootFolderId);

    rawFiles = rawFiles.filter((file) => {
      if (file.parents && file.parents.length > 0) {
        return file.parents.some((parent) => validParentIds.has(parent));
      }
      return false;
    });
  }

  const allFiles = rawFiles.map((file) => ({
    ...file,
    isFolder: file.mimeType === "application/vnd.google-apps.folder",
  }));

  const localUsage = allFiles.reduce(
    (acc, file) => acc + parseInt(file.size || "0", 10),
    0,
  );

  const finalUsage = rootFolderId ? localUsage : globalUsage;

  const breakdownMap: Record<string, { size: number; count: number }> = {};
  allFiles.forEach((file: DriveFile) => {
    let type = "Lainnya";
    const mime = file.mimeType || "";

    if (mime.startsWith("image/")) type = "Gambar";
    else if (mime.startsWith("video/")) type = "Video";
    else if (mime.startsWith("audio/")) type = "Audio";
    else if (mime === "application/pdf") type = "PDF";
    else if (
      mime.includes("zip") ||
      mime.includes("rar") ||
      mime.includes("tar") ||
      mime.includes("7z")
    )
      type = "Arsip";
    else if (
      mime.includes("word") ||
      mime.includes("document") ||
      mime.includes("sheet") ||
      mime.includes("presentation")
    )
      type = "Dokumen";

    if (!breakdownMap[type]) {
      breakdownMap[type] = { size: 0, count: 0 };
    }

    const fileSize = parseInt(file.size || "0", 10);
    breakdownMap[type].size += fileSize;
    breakdownMap[type].count += 1;
  });

  const breakdown = Object.entries(breakdownMap)
    .map(([type, data]) => ({
      type,
      count: data.count,
      size: data.size,
    }))
    .sort((a, b) => b.size - a.size);

  return {
    usage: finalUsage,
    limit,
    breakdown,
    largestFiles: allFiles.slice(0, 10),
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
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const response = await fetchWithRetry(
    `${GOOGLE_DRIVE_API_URL}?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return (data.files || []) as DriveFile[];
}

export async function listTrashedFiles() {
  const accessToken = await getAccessToken();
  const GOOGLE_DRIVE_API_URL = "https://www.googleapis.com/drive/v3/files";
  const params = new URLSearchParams({
    q: "trashed=true",
    fields:
      "files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, thumbnailLink, hasThumbnail, parents, trashed)",
    pageSize: "100",
    orderBy: "modifiedTime desc",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const response = await fetchWithRetry(
    `${GOOGLE_DRIVE_API_URL}?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!response.ok) throw new Error("Failed to fetch trash");
  const data = await response.json();
  return (data.files || []).map((file: unknown) => {
    const driveFile = file as DriveFile;
    return {
      ...driveFile,
      isFolder: driveFile.mimeType === "application/vnd.google-apps.folder",
    };
  });
}

export async function restoreTrash(fileId: string | string[]) {
  const accessToken = await getAccessToken();
  const ids = Array.isArray(fileId) ? fileId : [fileId];

  const restorePromises = ids.map((id) => {
    return fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trashed: false }),
    });
  });

  const results = await Promise.all(restorePromises);
  results.forEach((res) => {
    if (!res.ok) {
      console.error(`Failed to restore a file: ${res.statusText}`);
    }
  });
}

export async function deleteForever(fileId: string | string[]) {
  const accessToken = await getAccessToken();
  const ids = Array.isArray(fileId) ? fileId : [fileId];

  const deletePromises = ids.map((id) => {
    return fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  });

  const results = await Promise.all(deletePromises);
  results.forEach((res) => {
    if (!res.ok) {
      console.error(`Failed to delete a file forever: ${res.statusText}`);
    }
  });
}

export async function listFileRevisions(
  fileId: string,
): Promise<DriveRevision[]> {
  const accessToken = await getAccessToken();
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/revisions?fields=revisions(id,modifiedTime,keepForever,size,originalFilename,lastModifyingUser)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) throw new Error("Failed to list revisions");
  const data = await response.json();
  return data.revisions || [];
}
