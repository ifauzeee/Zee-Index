interface CacheEntry<T> {
  value: T;
  expires: number;
  staleAt: number;
  accessCount: number;
  lastAccess: number;
}
import { logger } from "./logger";

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
}

const DEFAULT_TTL = 30_000;
const MAX_ENTRIES = 1000;
const CLEANUP_INTERVAL = 60_000;

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
  private cleanupTimer: NodeJS.Timer | null = null;

  constructor() {
    if (typeof setInterval !== "undefined") {
      this.startCleanup();
    }
  }

  private startCleanup() {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, CLEANUP_INTERVAL);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.debug(`[MemoryCache] Cleaned ${cleaned} expired entries`);
    }
  }

  private evictLRU() {
    if (this.cache.size < MAX_ENTRIES) return;

    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].lastAccess - b[1].lastAccess,
    );

    const toEvict = Math.ceil(MAX_ENTRIES * 0.1);
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
      this.stats.evictions++;
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;

    return entry.value as T;
  }

  set<T>(
    key: string,
    value: T,
    ttlMs: number = DEFAULT_TTL,
    swrMs: number = 0,
  ): void {
    this.evictLRU();

    const now = Date.now();
    this.cache.set(key, {
      value,
      expires: now + ttlMs,
      staleAt: now + (ttlMs - swrMs),
      accessCount: 1,
      lastAccess: now,
    });

    this.stats.sets++;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  deleteByPrefix(prefix: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): CacheStats & { size: number; hitRate: string } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate =
      total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + "%" : "0%";

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate,
    };
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttlMs);
    return value;
  }

  async getWithSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL,
    swrMs: number = ttlMs / 2,
  ): Promise<T> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();

    if (entry && entry.expires > now) {
      if (now > entry.staleAt) {
        logger.debug({ key }, "[MemoryCache] SWR Revalidating");
        fetcher()
          .then((value) => this.set(key, value, ttlMs, swrMs))
          .catch((err) =>
            logger.warn({ err, key }, "[MemoryCache] SWR Revalidation failed"),
          );
      }
      this.stats.hits++;
      entry.accessCount++;
      entry.lastAccess = now;
      return entry.value;
    }

    this.stats.misses++;
    const value = await fetcher();
    this.set(key, value, ttlMs, swrMs);
    return value;
  }
}

export const memoryCache = new MemoryCache();

export function getCached<T>(key: string): T | null {
  return memoryCache.get<T>(key);
}

export function setCached<T>(key: string, value: T, ttlMs?: number): void {
  memoryCache.set(key, value, ttlMs);
}

export function invalidateCache(key: string): boolean {
  return memoryCache.delete(key);
}

export function invalidateCacheByPrefix(prefix: string): number {
  return memoryCache.deleteByPrefix(prefix);
}

export const CACHE_TTL = {
  FOLDER_CONTENT: 60_000,
  FOLDER_PATH: 300_000,
  FILE_DETAILS: 120_000,
  PROTECTED_FOLDERS: 60_000,
  USER_ACCESS: 30_000,
  CONFIG: 300_000,
  SHARE_TOKEN: 60_000,
} as const;
