import { kv } from "@/lib/kv";
import { memoryCache, CACHE_TTL } from "@/lib/memory-cache";
import { getAccessToken } from "./auth";
import { fetchWithRetry } from "./client";
import {
  DriveFile,
  DriveListResponse,
  DriveRevision,
  SharedDrive,
} from "./types";

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

export async function listSharedWithMeFolders(): Promise<DriveFile[]> {
  const accessToken = await getAccessToken();
  const url = "https://www.googleapis.com/drive/v3/files";
  const params = new URLSearchParams({
    q: "sharedWithMe = true and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: "files(id, name, mimeType, owners)",
    pageSize: "100",
  });

  const response = await fetchWithRetry(`${url}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.files || [];
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
    console.warn("Failed to cache folder tree:", e);
  }

  return folderArray;
}

export async function listFilesFromDrive(
  folderId: string,
  pageToken?: string | null,
  pageSize: number = 50,
  useCache: boolean = true,
) {
  const cacheKey = `zee-index:folder-content-v3:${folderId}:${pageToken || "first"}`;
  const memoryCacheKey = `drive:folder:${folderId}:${pageToken || "first"}`;

  if (useCache) {
    const memoryCached = memoryCache.get<{
      files: DriveFile[];
      nextPageToken: string | null;
    }>(memoryCacheKey);
    if (memoryCached) return memoryCached;

    try {
      const cached = await kv.get(cacheKey);
      if (cached) {
        const result = cached as {
          files: DriveFile[];
          nextPageToken: string | null;
        };
        memoryCache.set(memoryCacheKey, result, CACHE_TTL.FOLDER_CONTENT);
        return result;
      }
    } catch (e) {
      console.warn("Redis cache hit error:", e);
    }
  }

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

  const result = {
    files: processedFiles,
    nextPageToken: data.nextPageToken || null,
  };

  const ttl = processedFiles.length === 0 ? 5 : 3600;
  const memoryTtl =
    processedFiles.length === 0 ? 5000 : CACHE_TTL.FOLDER_CONTENT;

  memoryCache.set(memoryCacheKey, result, memoryTtl);
  kv.set(cacheKey, result, { ex: ttl }).catch(console.error);

  return result;
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
  locale: string = "en",
): Promise<{ id: string; name: string }[]> {
  const cacheKey = `zee-index:folder-path-v7:${folderId}:${locale}`;
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
  const rootId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID?.trim();
  const rootName =
    process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME ||
    (locale === "id" ? "Beranda" : "Home");

  const dbDrivesRaw = await kv.get("zee-index:manual-drives");
  const dbDrives: any[] = Array.isArray(dbDrivesRaw) ? dbDrivesRaw : [];
  const envDrives = (process.env.NEXT_PUBLIC_MANUAL_DRIVES || "")
    .split(",")
    .reduce<string[]>((acc, entry) => {
      const [id] = entry.split(":");
      if (id?.trim()) acc.push(id.trim());
      return acc;
    }, []);

  const shortcutMap = new Map<string, string>();
  if (rootId) shortcutMap.set(rootId, rootName);
  envDrives.forEach((id) => {
    if (id?.trim()) shortcutMap.set(id.trim(), "");
  });
  dbDrives.forEach((d) => {
    if (d && d.id) shortcutMap.set(d.id.trim(), d.name || "");
  });

  const driveFallback = locale === "id" ? "Drive Bersama" : "Shared Drive";

  let iterations = 0;
  while (currentId && iterations < 20) {
    iterations++;

    if (shortcutMap.has(currentId)) {
      const driveUrl = `https://www.googleapis.com/drive/v3/files/${currentId}?fields=id,name`;
      try {
        const response = await fetchWithRetry(driveUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          const displayName = shortcutMap.get(currentId) || data.name;
          path.unshift({ id: data.id, name: displayName });
        } else {
          path.unshift({
            id: currentId,
            name: shortcutMap.get(currentId) || driveFallback,
          });
        }
      } catch {
        path.unshift({
          id: currentId,
          name: shortcutMap.get(currentId) || driveFallback,
        });
      }
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

export async function searchFilesInFolder(
  accessToken: string,
  folderId: string,
  searchTerm: string,
  queryField: string,
  mimeQuery: string,
  dateQuery: string,
): Promise<DriveFile[]> {
  const GOOGLE_DRIVE_API_URL = "https://www.googleapis.com/drive/v3/files";
  const sanitizedSearchTerm = searchTerm.replace(/['\\]/g, "\\$&");
  let driveQuery = `${queryField} contains '${sanitizedSearchTerm}' and trashed=false`;
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

export async function fetchMetadata(
  fileId: string,
  accessToken: string,
): Promise<any> {
  const cleanId = fileId.split("&")[0].split("?")[0].trim();
  const response = await fetchWithRetry(
    `https://www.googleapis.com/drive/v3/files/${cleanId}?fields=id,name,mimeType,parents,trashed,shortcutDetails&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to fetch metadata");
  }

  return response.json();
}
