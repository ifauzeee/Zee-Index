import { kv } from "@/lib/kv";
import { memoryCache } from "@/lib/memory-cache";
import { logger } from "@/lib/logger";

export async function invalidateFolderCache(folderId: string) {
  try {
    const patterns = [
      `zee-index:folder-content-v3:${folderId}:*`,
      `zee-index:folder-path-v7:*`,
      `zee-index:folder-tree*`,
    ];

    for (const pattern of patterns) {
      const keys = await kv.scanKeys(pattern);
      if (keys.length > 0) {
        await kv.del(...keys);
      }
    }

    const memoryPrefixes = [
      `drive:folder:${folderId}:`,
      `folder-path:${folderId}:`,
      `auth:protected:${folderId}`,
      `auth:access:${folderId}:`,
    ];
    for (const prefix of memoryPrefixes) {
      memoryCache.deleteByPrefix(prefix);
    }
    memoryCache.delete(`auth:protected:${folderId}`);

    logger.debug(`[Cache] Full invalidation for folder ${folderId}`);
  } catch (error) {
    logger.error(
      { err: error, folderId },
      `Gagal melakukan invalidasi cache untuk folder ${folderId}`,
    );
  }
}
