interface CacheEntry<T> {
  value: T;
  expires: number;
  accessCount: number;
  lastAccess: number;
}

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

  /**
   * Get a value from cache
   */
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

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL): void {
    this.evictLRU();

    this.cache.set(key, {
      value,
      expires: Date.now() + ttlMs,
      accessCount: 1,
      lastAccess: Date.now(),
    });

    this.stats.sets++;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern (simple prefix match)
   */
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

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
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

  /**
   * Get or set pattern - fetch from cache or compute and store
   */
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
