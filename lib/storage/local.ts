import fs from "fs/promises";
import path from "path";
import { getMimeType } from "./mime";
import { ZeeFile, ListFilesResponse } from "@/types/storage";
import { logger } from "@/lib/logger";

const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || "storage";
export const LOCAL_ROOT = path.isAbsolute(LOCAL_STORAGE_PATH)
  ? LOCAL_STORAGE_PATH
  : path.resolve(process.cwd(), LOCAL_STORAGE_PATH);

export function isPathInsideLocalRoot(targetPath: string): boolean {
  const root = path.resolve(LOCAL_ROOT);
  const absoluteTarget = path.resolve(targetPath);
  const relativePath = path.relative(root, absoluteTarget);

  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function resolveLocalTargetPath(filePath: string): string {
  const normalizedFilePath = filePath.startsWith("/")
    ? filePath.substring(1)
    : filePath;
  const absolutePath = path.resolve(LOCAL_ROOT, normalizedFilePath);

  if (!isPathInsideLocalRoot(absolutePath)) {
    throw new Error("Akses dilarang (Path traversal)");
  }

  return absolutePath;
}

function sanitizeLocalFileName(fileName: string): string {
  const trimmedName = fileName.trim();
  if (
    !trimmedName ||
    trimmedName === "." ||
    trimmedName === ".." ||
    trimmedName.includes("/") ||
    trimmedName.includes("\\")
  ) {
    throw new Error("Nama file tidak valid");
  }

  return trimmedName;
}

export async function ensureLocalRoot() {
  try {
    await fs.access(LOCAL_ROOT);
  } catch {
    logger.debug(`[Storage] Creating local storage root: ${LOCAL_ROOT}`);
    await fs.mkdir(LOCAL_ROOT, { recursive: true });
  }

  const tempDir = path.join(LOCAL_ROOT, ".tmp", "uploads");
  try {
    await fs.access(tempDir);
  } catch {
    await fs.mkdir(tempDir, { recursive: true });
  }
}

export async function listLocalFiles(
  folderPath: string,
): Promise<ListFilesResponse> {
  await ensureLocalRoot();
  const absolutePath = resolveLocalTargetPath(folderPath);

  const allEntries = await fs.readdir(absolutePath, { withFileTypes: true });
  const entries = allEntries.filter((e) => !e.name.startsWith("."));

  const files: ZeeFile[] = await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(absolutePath, entry.name);
      const stats = await fs.stat(filePath);
      const relativePath = path
        .relative(LOCAL_ROOT, filePath)
        .replace(/\\/g, "/");
      const entryMimeType =
        getMimeType(entry.name) || "application/octet-stream";
      const isFolder = entry.isDirectory();
      const isImage = entryMimeType.startsWith("image/");

      return {
        id: `local-storage:${relativePath}`,
        name: entry.name,
        mimeType: isFolder
          ? "application/vnd.google-apps.folder"
          : entryMimeType,
        size: String(stats.size),
        modifiedTime: stats.mtime.toISOString(),
        createdTime: stats.birthtime.toISOString(),
        isFolder,
        source: "local" as const,
        hasThumbnail: isImage,
        thumbnailLink: isImage
          ? `/api/download?fileId=local-storage:${relativePath}`
          : undefined,
        path: relativePath,
      };
    }),
  );

  return {
    files,
    nextPageToken: null,
  };
}

export async function getLocalFileDetails(
  filePath: string,
): Promise<ZeeFile | null> {
  await ensureLocalRoot();
  let absolutePath = "";

  try {
    absolutePath = resolveLocalTargetPath(filePath);
  } catch {
    logger.error(`[Storage] Path traversal attempt: ${filePath}`);
    return null;
  }

  try {
    const stats = await fs.stat(absolutePath);
    const isFolder = stats.isDirectory();
    const relativePath = path
      .relative(LOCAL_ROOT, absolutePath)
      .replace(/\\/g, "/");
    const mimeType = getMimeType(absolutePath) || "application/octet-stream";
    const isImage = mimeType.startsWith("image/");

    return {
      id: `local-storage:${relativePath}`,
      name: path.basename(absolutePath),
      mimeType: isFolder ? "application/vnd.google-apps.folder" : mimeType,
      size: String(stats.size),
      modifiedTime: stats.mtime.toISOString(),
      createdTime: stats.birthtime.toISOString(),
      isFolder,
      source: "local" as const,
      hasThumbnail: isImage,
      thumbnailLink: isImage
        ? `/api/download?fileId=local-storage:${relativePath}`
        : undefined,
      path: relativePath,
    };
  } catch {
    return null;
  }
}

export async function getLocalFilePath(filePath: string): Promise<string> {
  await ensureLocalRoot();
  return resolveLocalTargetPath(filePath);
}

export async function saveLocalChunk(
  uploadUrl: string,
  chunk: ArrayBuffer,
  contentRange: string,
) {
  const marker = "local-storage-upload://";
  const content = uploadUrl.replace(marker, "");
  const firstSlash = content.indexOf("/");
  const parentIdEncoded = content.substring(0, firstSlash);
  const fileNameEncoded = content.substring(firstSlash + 1);

  const parentId = decodeURIComponent(parentIdEncoded);
  const fileName = sanitizeLocalFileName(decodeURIComponent(fileNameEncoded));

  await ensureLocalRoot();

  const tempKey = Buffer.from(`${parentId}/${fileName}`)
    .toString("hex")
    .substring(0, 16);
  const tempFilePath = path.join(
    LOCAL_ROOT,
    ".tmp",
    "uploads",
    `${tempKey}.partial`,
  );
  const finalFolderPath = await getLocalFilePath(
    parentId.replace("local-storage:", ""),
  );
  const finalFilePath = path.join(finalFolderPath, fileName);

  const rangeMatch = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
  if (!rangeMatch) throw new Error("Content-Range tidak valid");

  const start = parseInt(rangeMatch[1]);
  const end = parseInt(rangeMatch[2]);
  const total = parseInt(rangeMatch[3]);

  const buffer = Buffer.from(chunk);
  const handle = await fs.open(tempFilePath, start === 0 ? "w" : "r+");

  try {
    await handle.write(buffer, 0, buffer.length, start);
  } finally {
    await handle.close();
  }

  if (end + 1 >= total) {
    await fs.mkdir(path.dirname(finalFilePath), { recursive: true });

    await fs.rename(tempFilePath, finalFilePath);

    const stats = await fs.stat(finalFilePath);
    return {
      status: "completed",
      file: {
        id: `local-storage:${path
          .relative(LOCAL_ROOT, finalFilePath)
          .replace(/\\/g, "/")}`,
        name: fileName,
        size: String(stats.size),
        mimeType: getMimeType(fileName) || "application/octet-stream",
      },
    };
  }

  return { status: "partial" };
}

export async function deleteLocalFile(filePath: string): Promise<void> {
  await ensureLocalRoot();
  const absolutePath = resolveLocalTargetPath(filePath);

  const stats = await fs.stat(absolutePath);
  if (stats.isDirectory()) {
    await fs.rm(absolutePath, { recursive: true, force: true });
  } else {
    await fs.unlink(absolutePath);
  }
}

export async function uploadLocalFile(
  parentId: string,
  fileName: string,
  buffer: Buffer,
): Promise<ZeeFile> {
  await ensureLocalRoot();

  const safeName = sanitizeLocalFileName(fileName);
  const parentFolder = parentId.replace("local-storage:", "");

  const targetDir = await getLocalFilePath(parentFolder);
  const targetPath = path.join(targetDir, safeName);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, buffer);

  const stats = await fs.stat(targetPath);
  const relativePath = path
    .relative(LOCAL_ROOT, targetPath)
    .replace(/\\/g, "/");
  const mimeType = getMimeType(safeName) || "application/octet-stream";
  const isImage = mimeType.startsWith("image/");

  return {
    id: `local-storage:${relativePath}`,
    name: safeName,
    mimeType,
    size: String(stats.size),
    modifiedTime: stats.mtime.toISOString(),
    createdTime: stats.birthtime.toISOString(),
    isFolder: false,
    source: "local" as const,
    hasThumbnail: isImage,
    thumbnailLink: isImage
      ? `/api/download?fileId=local-storage:${relativePath}`
      : undefined,
    path: relativePath,
  };
}
