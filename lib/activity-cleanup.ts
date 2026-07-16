import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const DEFAULT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Deletes activity log entries older than `retentionMs`.
 * Returns the number of deleted rows, or 0 on failure.
 *
 * Extracted from the hot path (logActivity) into a dedicated function
 * so it can be called by a cron endpoint instead of on every write.
 */
export async function cleanupOldActivityLogs(
  retentionMs: number = DEFAULT_RETENTION_MS,
): Promise<number> {
  const cutoff = Date.now() - retentionMs;

  try {
    const result = await db.activityLog.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });

    if (result.count > 0) {
      logger.info(
        { deletedCount: result.count, cutoff },
        "[ActivityCleanup] Old activity logs purged",
      );
    }

    return result.count;
  } catch (error: unknown) {
    logger.error(
      { err: error },
      "[ActivityCleanup] Failed to clean old activity logs",
    );
    return 0;
  }
}
