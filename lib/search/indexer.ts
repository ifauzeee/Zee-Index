import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAccessToken } from "@/lib/drive";
import { GOOGLE_DRIVE_API_BASE_URL } from "@/lib/constants";
import { fetchWithRetry } from "@/lib/drive/client";
import { extractText, isExtractable, MAX_EXTRACT_SIZE } from "./extractor";
import type { FileIndex } from "@prisma/client";

/* ------- public API ---------------------------------------------------- */

/**
 * Download a file from Google Drive and return its raw buffer.
 * Returns `null` if the file is too large or cannot be fetched.
 */
async function downloadFileBuffer(
  fileId: string,
  mimeType: string,
  size: number | null,
): Promise<Buffer | null> {
  if (size !== null && size > MAX_EXTRACT_SIZE) {
    logger.debug(
      { fileId, size },
      "[Indexer] Skipping content download — file exceeds max extraction size",
    );
    return null;
  }

  try {
    const token = await getAccessToken();
    const url = `${GOOGLE_DRIVE_API_BASE_URL}/files/${fileId}?alt=media&supportsAllDrives=true`;

    const response = await fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      logger.warn(
        { fileId, status: response.status },
        "[Indexer] Failed to download file content",
      );
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    logger.warn({ err, fileId }, "[Indexer] Download failed");
    return null;
  }
}

/**
 * Extract full text from a file identified by its Drive record and persist it
 * into the `FileIndex.contentText` column.
 *
 * Can be called:
 * - Inline during file browsing / on-access (fire-and-forget).
 * - In bulk during a full reindex (from `reindexDrive`).
 *
 * Returns `true` when the file was successfully indexed (content extracted
 * and saved, or skipped because the format is unsupported).
 */
export async function indexFileContent(
  fileId: string,
  fileName: string,
  mimeType: string,
  fileSize: number | null,
): Promise<boolean> {
  // Only attempt extraction for supported mime types
  if (!isExtractable(mimeType)) {
    return false;
  }

  // If file already has contentText, skip (idempotent)
  try {
    const existing = await db.fileIndex.findUnique({ where: { id: fileId } });
    if (existing?.contentText) {
      return true; // already indexed
    }
  } catch {
    // Proceed if we can't check
  }

  const buffer = await downloadFileBuffer(fileId, mimeType, fileSize);
  if (!buffer) return false;

  const text = await extractText(buffer, mimeType, buffer.length);
  if (!text) return false;

  try {
    await db.fileIndex.update({
      where: { id: fileId },
      data: { contentText: text },
    });

    logger.info(
      { fileId, fileName, length: text.length },
      "[Indexer] Content indexed successfully",
    );
    return true;
  } catch (err) {
    logger.warn({ err, fileId }, "[Indexer] Failed to persist contentText");
    return false;
  }
}

/**
 * Index content for every file in the index that supports text extraction but
 * does NOT have `contentText` populated yet.
 *
 * Runs sequentially (per-file) to avoid flooding the Drive API quota.
 * Call this from a cron job or admin action.
 */
export async function indexAllPendingContent(opts?: {
  concurrency?: number;
}): Promise<{ indexed: number; skipped: number; failed: number }> {
  let indexed = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const pending = await db.fileIndex.findMany({
      where: {
        contentText: null,
        size: { lte: MAX_EXTRACT_SIZE },
      },
      take: 200, // process in batches
    });

    if (pending.length === 0) {
      return { indexed: 0, skipped: 0, failed: 0 };
    }

    for (const file of pending) {
      // Filter by extractable types in memory (Prisma doesn't have this filter)
      if (!isExtractable(file.mimeType)) {
        skipped++;
        continue;
      }

      const ok = await indexFileContent(
        file.id,
        file.name,
        file.mimeType,
        file.size,
      );
      if (ok) {
        indexed++;
      } else {
        failed++;
      }
    }
  } catch (err) {
    logger.error({ err }, "[Indexer] Batch content indexing failed");
    failed++;
  }

  return { indexed, skipped, failed };
}
