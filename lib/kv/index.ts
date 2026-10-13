import { memoryCache } from "../memory-cache";
import { logger } from "../logger";
import { RedisKV } from "./redis-kv";
import { InMemoryKV } from "./memory-kv";
import type { KVClient } from "./types";

export type { KVClient } from "./types";

const redisUrl =
  typeof process !== "undefined" ? process.env?.REDIS_URL : undefined;

if (typeof window === "undefined") {
  if (redisUrl) {
    logger.info("[KV] Connecting to Redis...");
  } else {
    logger.info(
      "[KV] Using in-memory store (data will not persist across restarts)",
    );
  }
}

function createKVClient(): KVClient {
  // proxy.ts and every route run on Node.js, so the only non-server caller
  // is a client bundle that imports this module by accident.
  if (typeof window !== "undefined") {
    return new InMemoryKV();
  }

  if (redisUrl) {
    try {
      return new RedisKV(redisUrl);
    } catch (err) {
      logger.error(
        { err },
        "[KV] Failed to initialize Redis, falling back to in-memory",
      );
      return new InMemoryKV();
    }
  }

  return new InMemoryKV();
}

export const kv: KVClient = createKVClient();

export function getKvCacheStats() {
  return memoryCache.getStats();
}
