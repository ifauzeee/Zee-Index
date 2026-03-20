import { memoryCache } from "../memory-cache";
import { logger } from "../logger";
import { RedisKV } from "./redis-kv";
import { InMemoryKV } from "./memory-kv";
import type { KVClient } from "./types";

export type { KVClient } from "./types";

const isEdgeRuntime =
  typeof globalThis !== "undefined" &&
  (globalThis as Record<string, unknown>).EdgeRuntime !== undefined;

const redisUrl =
  typeof process !== "undefined" ? process.env?.REDIS_URL : undefined;

if (typeof window === "undefined" && !isEdgeRuntime) {
  if (redisUrl) {
    logger.info("[KV] Connecting to Redis...");
  } else {
    logger.info(
      "[KV] Using in-memory store (data will not persist across restarts)",
    );
  }
}

function createKVClient(): KVClient {
  if (isEdgeRuntime || typeof window !== "undefined") {
    return new InMemoryKV();
  }

  if (redisUrl) {
    try {
      return new RedisKV(redisUrl);
    } catch (err) {
      console.error(
        "[KV] Failed to initialize Redis, falling back to in-memory:",
        err,
      );
      return new InMemoryKV();
    }
  }

  return new InMemoryKV();
}

export const kv: KVClient = createKVClient();

export function invalidateKvCache(key: string): void {
  memoryCache.delete(`kv:${key}`);
  memoryCache.delete(`kv:hash:${key}`);
}

export function invalidateKvCacheByPrefix(prefix: string): void {
  memoryCache.deleteByPrefix(`kv:${prefix}`);
}

export function getKvStats() {
  return {
    kv:
      redisUrl && !isEdgeRuntime
        ? { type: "redis" }
        : (kv as unknown as InMemoryKV).getStats(),
    memoryCache: memoryCache.getStats(),
  };
}

export function getKvCacheStats() {
  return memoryCache.getStats();
}
