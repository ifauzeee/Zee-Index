import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface IndexedFile {
  id: string;
  name: string;
  mimeType: string;
  folderId: string;
  source: string;
  size: number | null;
  modifiedTime: Date;
}

interface UpsertInput {
  id: string;
  name: string;
  mimeType: string;
  folderId: string;
  source: string;
  modifiedTime?: string | Date;
  size?: number | null;
}

export async function upsertIndexedFile(file: UpsertInput): Promise<void> {
  try {
    const modifiedTime = file.modifiedTime
      ? new Date(file.modifiedTime)
      : new Date();
    await db.fileIndex.upsert({
      where: { id: file.id },
      create: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        folderId: file.folderId,
        source: file.source,
        modifiedTime,
        size: file.size ?? null,
      },
      update: {
        name: file.name,
        mimeType: file.mimeType,
        folderId: file.folderId,
        source: file.source,
        modifiedTime,
        size: file.size ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, id: file.id }, "Failed to index file");
  }
}

export async function removeIndexedFile(id: string): Promise<void> {
  try {
    await db.fileIndex.delete({ where: { id } });
  } catch {
    // Already missing — nothing to do.
  }
}

function mimeFilter(
  mimeType?: string | null,
): Record<string, unknown> | undefined {
  if (!mimeType) return undefined;
  switch (mimeType) {
    case "folder":
      return { mimeType: "application/vnd.google-apps.folder" };
    case "pdf":
      return { mimeType: "application/pdf" };
    case "image":
    case "video":
    case "audio":
      return { mimeType: { contains: `${mimeType}/` } };
    default:
      return { mimeType: { contains: mimeType } };
  }
}

export async function searchIndexedFiles(opts: {
  query: string;
  mimeType?: string | null;
  limit?: number;
}): Promise<IndexedFile[]> {
  const q = opts.query.trim();
  if (!q) return [];

  const where: Record<string, unknown> = {
    name: { contains: q, mode: "insensitive" },
  };
  const mime = mimeFilter(opts.mimeType);
  if (mime) Object.assign(where, mime);

  try {
    const rows = await db.fileIndex.findMany({
      where,
      orderBy: { modifiedTime: "desc" },
      take: opts.limit ?? 50,
    });
    return rows as IndexedFile[];
  } catch (err) {
    logger.error({ err }, "Postgres file search failed");
    return [];
  }
}

export async function reindexDrive(): Promise<{
  indexed: number;
  failed: number;
}> {
  const { getAccessToken, getAllDescendantFolders, listFilesFromDrive } =
    await import("@/lib/drive");
  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
  if (!rootFolderId) {
    return { indexed: 0, failed: 0 };
  }

  let indexed = 0;
  let failed = 0;

  try {
    const accessToken = await getAccessToken();
    const folderIds = await getAllDescendantFolders(accessToken, rootFolderId);
    folderIds.unshift(rootFolderId);

    for (const folderId of folderIds) {
      let pageToken: string | null = null;
      do {
        const result = await listFilesFromDrive(
          folderId,
          pageToken,
          200,
          false,
        );
        for (const file of result.files) {
          try {
            await upsertIndexedFile({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              folderId,
              source: "google-drive",
              modifiedTime: file.modifiedTime,
              size: typeof file.size === "number" ? file.size : null,
            });
            indexed += 1;
          } catch {
            failed += 1;
          }
        }
        pageToken = result.nextPageToken || null;
      } while (pageToken);
    }
  } catch (err) {
    logger.error({ err }, "Drive reindex failed");
    failed += 1;
  }

  return { indexed, failed };
}
