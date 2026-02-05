import { kv } from "@/lib/kv";
import { memoryCache } from "@/lib/memory-cache";

export async function invalidateFolderCache(folderId: string) {
  try {
    const patterns = [
      `zee-index:folder-content-v3:${folderId}:*`,
      `zee-index:folder-path-v7:${folderId}:*`,
      `zee-index:folder-tree*`,
    ];

    for (const pattern of patterns) {
      const keys = await kv.keys(pattern);
      if (keys.length > 0) {
        await kv.del(...keys);
      }
    }

    const memoryPrefixes = [
      `drive:folder:${folderId}:`,
      `folder-path:${folderId}:`,
    ];
    for (const prefix of memoryPrefixes) {
      memoryCache.deleteByPrefix(prefix);
    }

    console.log(`[Cache] Full invalidation for folder ${folderId}`);
  } catch (error) {
    console.error(
      `Gagal melakukan invalidasi cache untuk folder ${folderId}:`,
      error,
    );
  }
}
