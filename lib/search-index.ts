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
  /** Extracted full-text content (nullable). */
  contentText?: string | null;
}

interface UpsertInput {
  id: string;
  name: string;
  mimeType: string;
  folderId: string;
  source: string;
  modifiedTime?: string | Date;
  size?: number | null;
  contentText?: string | null;
}

export async function upsertIndexedFile(file: UpsertInput): Promise<void> {
  try {
    const modifiedTime = file.modifiedTime
      ? new Date(file.modifiedTime)
      : new Date();
    const data = {
      name: file.name,
      mimeType: file.mimeType,
      folderId: file.folderId,
      source: file.source,
      modifiedTime,
      size: file.size ?? null,
      ...(file.contentText !== undefined
        ? { contentText: file.contentText }
        : {}),
    };

    await db.fileIndex.upsert({
      where: { id: file.id },
      create: { id: file.id, ...data },
      update: data,
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
  /** When true, also search in `contentText` (full-text content). Defaults to false. */
  fullText?: boolean;
}): Promise<IndexedFile[]> {
  const q = opts.query.trim();
  if (!q) return [];

  const mime = mimeFilter(opts.mimeType);

  if (opts.fullText) {
    // Full-text search: match in name OR contentText
    const where: Record<string, unknown> = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { contentText: { contains: q, mode: "insensitive" } },
      ],
    };
    if (mime) Object.assign(where, mime);

    try {
      const rows = await db.fileIndex.findMany({
        where,
        orderBy: { modifiedTime: "desc" },
        take: opts.limit ?? 50,
      });
      return rows as IndexedFile[];
    } catch (err) {
      logger.error({ err }, "Postgres full-text search failed");
      return [];
    }
  }

  // Legacy name-only search
  const where: Record<string, unknown> = {
    name: { contains: q, mode: "insensitive" },
  };
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
