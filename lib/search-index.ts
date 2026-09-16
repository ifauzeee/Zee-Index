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
  const limit = opts.limit ?? 50;

  try {
    const nameWhere: Record<string, unknown> = {
      name: { contains: q, mode: "insensitive" },
    };
    if (mime) Object.assign(nameWhere, mime);

    const nameMatches = await db.fileIndex.findMany({
      where: nameWhere,
      orderBy: { modifiedTime: "desc" },
      take: limit,
    });

    if (!opts.fullText) {
      return nameMatches as IndexedFile[];
    }

    if (nameMatches.length >= limit) {
      return nameMatches as IndexedFile[];
    }

    const excludeIds = nameMatches.map((r) => r.id);
    const contentWhere: Record<string, unknown> = {
      contentText: { contains: q, mode: "insensitive" },
      NOT: { id: { in: excludeIds } },
    };
    if (mime) Object.assign(contentWhere, mime);

    const contentMatches = await db.fileIndex.findMany({
      where: contentWhere,
      orderBy: { modifiedTime: "desc" },
      take: limit - nameMatches.length,
    });

    return [
      ...(nameMatches as IndexedFile[]),
      ...(contentMatches as IndexedFile[]),
    ];
  } catch (err) {
    logger.error({ err }, "Postgres file search failed");
    return [];
  }
}

const BATCH_SIZE = 100;

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

    const pending: UpsertInput[] = [];

    const flushBatch = async (batch: UpsertInput[]) => {
      const txOps = batch.map((file) =>
        db.fileIndex.upsert({
          where: { id: file.id },
          create: {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            folderId: file.folderId,
            source: file.source,
            modifiedTime: file.modifiedTime
              ? new Date(file.modifiedTime)
              : new Date(),
            size: file.size ?? null,
            ...(file.contentText !== undefined
              ? { contentText: file.contentText }
              : {}),
          },
          update: {
            name: file.name,
            mimeType: file.mimeType,
            folderId: file.folderId,
            source: file.source,
            modifiedTime: file.modifiedTime
              ? new Date(file.modifiedTime)
              : new Date(),
            size: file.size ?? null,
            ...(file.contentText !== undefined
              ? { contentText: file.contentText }
              : {}),
          },
        }),
      );
      await db.$transaction(txOps);
    };

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
            pending.push({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              folderId,
              source: "google-drive",
              modifiedTime: file.modifiedTime,
              size: typeof file.size === "number" ? file.size : null,
            });
            if (pending.length >= BATCH_SIZE) {
              const batch = pending.splice(0, BATCH_SIZE);
              try {
                await flushBatch(batch);
                indexed += batch.length;
              } catch {
                failed += batch.length;
              }
            }
          } catch {
            failed += 1;
          }
        }
        pageToken = result.nextPageToken || null;
      } while (pageToken);
    }

    if (pending.length > 0) {
      try {
        await flushBatch(pending);
        indexed += pending.length;
      } catch {
        failed += pending.length;
      }
    }
  } catch (err) {
    logger.error({ err }, "Drive reindex failed");
    failed += 1;
  }

  return { indexed, failed };
}
