import { fetchWithRetry } from "./client";
import { getAccessToken } from "./auth";
import { getAllDescendantFolders } from "./operations";
import { DriveFile } from "./types";
import { unstable_cache } from "next/cache";

async function fetchStorageDetails() {
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

export const getStorageDetails = unstable_cache(
  fetchStorageDetails,
  ["storage-details"],
  { revalidate: 300, tags: ["storage-details"] },
);
