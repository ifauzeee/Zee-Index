import { ZipArchive, type Archiver } from "archiver";
import { Readable } from "stream";
import { listAllFiles, getDownloadStream } from "@/lib/storage";

const MAX_ZIP_FILES = 200;
const MAX_ZIP_BYTES = 1024 * 1024 * 1024; // 1 GB

export interface ZipStats {
  files: number;
  totalBytes: number;
}

export class FolderZipError extends Error {}

export async function createFolderZipStream(
  folderId: string,
): Promise<{ stream: Archiver; stats: ZipStats }> {
  const data = await listAllFiles({
    folderId,
    pageToken: null,
    pageSize: 1000,
    useCache: true,
  });

  const files = data.files.filter((f) => !f.isFolder);
  if (files.length === 0) {
    throw new FolderZipError("Folder is empty");
  }
  if (files.length > MAX_ZIP_FILES) {
    throw new FolderZipError(
      `Too many files (${files.length} > ${MAX_ZIP_FILES})`,
    );
  }

  const totalBytes = files.reduce(
    (acc, f) => acc + (f.size ? Number(f.size) : 0),
    0,
  );
  if (totalBytes > MAX_ZIP_BYTES) {
    throw new FolderZipError(
      `Total size too large (${Math.round(totalBytes / 1024 / 1024)} MB > 1024 MB)`,
    );
  }

  const zip = new ZipArchive({ zlib: { level: 6 } });

  for (const file of files) {
    try {
      const download = await getDownloadStream(file.id);
      if (!download) continue;
      const nodeStream = Readable.fromWeb(
        download.stream as unknown as import("stream/web").ReadableStream,
      );
      zip.append(nodeStream, { name: file.name });
    } catch (err) {
      zip.destroy(new FolderZipError(`Failed to read ${file.name}`));
      throw err;
    }
  }

  await zip.finalize();

  return { stream: zip, stats: { files: files.length, totalBytes } };
}
