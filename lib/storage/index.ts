import {
  listFilesFromDrive,
  getFileDetailsFromDrive,
} from "@/lib/drive/fetchers";
import { listLocalFiles, getLocalFileDetails } from "./local";
import { getActiveProvider, isProviderId } from "./providers";
import { ZeeFile, ListFilesResponse, ListFilesOptions } from "@/types/storage";
import { logger } from "@/lib/logger";

export async function listAllFiles(
  options: ListFilesOptions,
): Promise<ListFilesResponse> {
  const { folderId: rawFolderId, pageToken, pageSize, useCache } = options;
  const folderId = decodeURIComponent(rawFolderId);
  const provider = getActiveProvider();

  if (folderId === "virtual-root") {
    const driveRoot = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID || "";
    const localEnabled =
      process.env.NEXT_PUBLIC_ENABLE_LOCAL_STORAGE === "true" &&
      !!process.env.LOCAL_STORAGE_PATH;

    const files: ZeeFile[] = [];

    if (provider) {
      files.push({
        id: provider.rootId,
        name: provider.rootName,
        mimeType: "application/vnd.google-apps.folder",
        isFolder: true,
        source: provider.source,
        hasThumbnail: false,
        modifiedTime: new Date().toISOString(),
      });
    } else if (driveRoot) {
      files.push({
        id: driveRoot,
        name: "Google Drive",
        mimeType: "application/vnd.google-apps.folder",
        isFolder: true,
        source: "google-drive",
        hasThumbnail: false,
        modifiedTime: new Date().toISOString(),
      });
    }

    if (localEnabled) {
      files.push({
        id: "local-storage:",
        name: process.env.NEXT_PUBLIC_LOCAL_STORAGE_NAME || "Local Storage",
        mimeType: "application/vnd.google-apps.folder",
        isFolder: true,
        source: "local",
        hasThumbnail: false,
        modifiedTime: new Date().toISOString(),
      });
    }

    return { files, nextPageToken: null };
  }

  if (
    provider &&
    (folderId === provider.rootId || folderId.startsWith(provider.idPrefix))
  ) {
    const result = await provider.listFiles(folderId, { pageToken, pageSize });
    return { files: result.files, nextPageToken: result.nextPageToken };
  }

  if (folderId.startsWith("local-storage:")) {
    if (process.env.NEXT_PUBLIC_ENABLE_LOCAL_STORAGE !== "true") {
      return { files: [], nextPageToken: null };
    }
    const localPath = folderId.replace("local-storage:", "");
    return listLocalFiles(localPath);
  }

  const driveResult = await listFilesFromDrive(
    folderId,
    pageToken,
    pageSize || 50,
    useCache,
  );

  return {
    files: driveResult.files.map((file) => ({
      ...file,
      source: "google-drive" as const,
      isFolder: file.mimeType === "application/vnd.google-apps.folder",
    })),
    nextPageToken: driveResult.nextPageToken || null,
  };
}

export async function getAnyFileDetails(
  fileId: string,
): Promise<ZeeFile | null> {
  const cleanId = decodeURIComponent(fileId);
  const provider = getActiveProvider();
  logger.debug(
    `[Storage] getAnyFileDetails called with: ${fileId} (cleaned: ${cleanId})`,
  );

  if (provider && isProviderId(cleanId)) {
    const details = await provider.getFileDetails(cleanId);
    if (details) return details;
  }

  if (cleanId.startsWith("local-storage:")) {
    if (process.env.NEXT_PUBLIC_ENABLE_LOCAL_STORAGE !== "true") {
      return null;
    }
    const localPath = cleanId.replace("local-storage:", "");
    logger.debug(
      `[Storage] Fetching local file: ${localPath} (ID: ${cleanId})`,
    );
    return getLocalFileDetails(localPath);
  }

  const driveFile = await getFileDetailsFromDrive(fileId);
  if (!driveFile) return null;

  return {
    ...driveFile,
    source: "google-drive" as const,
    isFolder: driveFile.mimeType === "application/vnd.google-apps.folder",
  };
}

export async function getDownloadStream(fileId: string) {
  const cleanId = decodeURIComponent(fileId);
  const provider = getActiveProvider();

  if (provider && isProviderId(cleanId)) {
    const download = await provider.getDownload(cleanId);
    if (!download) return null;
    return {
      stream: download.stream,
      size: download.size,
      mimeType: download.mimeType,
      filename: download.filename,
    };
  }

  if (cleanId.startsWith("local-storage:")) {
    if (process.env.NEXT_PUBLIC_ENABLE_LOCAL_STORAGE !== "true") {
      return null;
    }

    const { getLocalFilePath } = await import("./local");
    const { getMimeType } = await import("./mime");
    const { createReadStream } = await import("fs");
    const { stat } = await import("fs/promises");
    const path = await import("path");

    const localPath = cleanId.replace("local-storage:", "");
    try {
      const absolutePath = await getLocalFilePath(localPath);
      const fileStats = await stat(absolutePath);

      if (fileStats.isDirectory()) {
        throw new Error("Cannot download a directory");
      }

      const mimeType = getMimeType(absolutePath) || "application/octet-stream";
      const filename = path.basename(absolutePath);

      const stream = createReadStream(absolutePath);
      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk) => controller.enqueue(chunk));
          stream.on("end", () => controller.close());
          stream.on("error", (err) => controller.error(err));
        },
        cancel() {
          stream.destroy();
        },
      });

      return {
        stream: webStream,
        size: fileStats.size,
        mimeType,
        filename,
      };
    } catch (error) {
      logger.error(
        { err: error, fileId: cleanId },
        `[Storage] Error creating download stream`,
      );
      return null;
    }
  }

  return null;
}

export async function uploadFile(
  parentId: string,
  fileName: string,
  buffer: Buffer,
  mimeType?: string,
): Promise<ZeeFile | null> {
  const cleanParentId = decodeURIComponent(parentId);
  const provider = getActiveProvider();

  if (provider && isProviderId(cleanParentId)) {
    return provider.uploadFile(cleanParentId, fileName, buffer, mimeType);
  }

  if (cleanParentId.startsWith("local-storage:")) {
    if (process.env.NEXT_PUBLIC_ENABLE_LOCAL_STORAGE !== "true") {
      throw new Error("Local storage is not enabled");
    }
    const { uploadLocalFile } = await import("./local");
    return uploadLocalFile(cleanParentId, fileName, buffer);
  }

  const { uploadToDrive } = await import("@/lib/drive/mutators");
  const { getMimeType } = await import("./mime");
  const resolvedMimeType =
    mimeType || getMimeType(fileName) || "application/octet-stream";

  const result = await uploadToDrive(
    cleanParentId,
    fileName,
    buffer,
    resolvedMimeType,
  );

  return {
    id: result.id,
    name: result.name,
    mimeType: result.mimeType,
    isFolder: result.mimeType === "application/vnd.google-apps.folder",
    source: "google-drive" as const,
    hasThumbnail: result.mimeType.startsWith("image/"),
    modifiedTime: new Date().toISOString(),
  };
}
