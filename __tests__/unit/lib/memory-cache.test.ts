import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  memoryCache,
  getCached,
  setCached,
  invalidateCache,
  invalidateCacheByPrefix,
  CACHE_TTL,
} from "@/lib/memory-cache";

describe("lib/memory-cache", () => {
  beforeEach(() => {
    memoryCache.clear();
  });

  describe("get/set", () => {
    it("stores and retrieves a value", () => {
      memoryCache.set("key1", "value1");
      expect(memoryCache.get("key1")).toBe("value1");
    });

    it("stores objects", () => {
      const obj = { name: "test", count: 42 };
      memoryCache.set("obj", obj);
      expect(memoryCache.get("obj")).toEqual(obj);
    });

    it("stores arrays", () => {
      const arr = [1, 2, 3];
      memoryCache.set("arr", arr);
      expect(memoryCache.get("arr")).toEqual(arr);
    });

    it("returns null for non-existent keys", () => {
      expect(memoryCache.get("nonexistent")).toBeNull();
    });

    it("overwrites existing values", () => {
      memoryCache.set("key", "old");
      memoryCache.set("key", "new");
      expect(memoryCache.get("key")).toBe("new");
    });
  });

  describe("expiration", () => {
    it("returns null for expired entries", () => {
      memoryCache.set("expiring", "value", 1);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(memoryCache.get("expiring")).toBeNull();
          resolve();
        }, 10);
      });
    });

    it("returns value before expiration", () => {
      memoryCache.set("persist", "value", 60000);
      expect(memoryCache.get("persist")).toBe("value");
    });
  });

  describe("has", () => {
    it("returns true for existing key", () => {
      memoryCache.set("exists", "yes");
      expect(memoryCache.has("exists")).toBe(true);
    });

    it("returns false for non-existent key", () => {
      expect(memoryCache.has("nope")).toBe(false);
    });

    it("returns false for expired key", () => {
      memoryCache.set("short", "val", 1);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(memoryCache.has("short")).toBe(false);
          resolve();
        }, 10);
      });
    });
  });

  describe("delete", () => {
    it("removes a key", () => {
      memoryCache.set("toDelete", "value");
      expect(memoryCache.delete("toDelete")).toBe(true);
      expect(memoryCache.get("toDelete")).toBeNull();
    });

    it("returns false for non-existent key", () => {
      expect(memoryCache.delete("nonexistent")).toBe(false);
    });
  });

  describe("deleteByPrefix", () => {
    it("deletes all keys with prefix", () => {
      memoryCache.set("user:1", "alice");
      memoryCache.set("user:2", "bob");
      memoryCache.set("post:1", "hello");

      const deleted = memoryCache.deleteByPrefix("user:");
      expect(deleted).toBe(2);
      expect(memoryCache.get("user:1")).toBeNull();
      expect(memoryCache.get("user:2")).toBeNull();
      expect(memoryCache.get("post:1")).toBe("hello");
    });

    it("returns 0 when no keys match", () => {
      memoryCache.set("item:1", "val");
      expect(memoryCache.deleteByPrefix("xyz:")).toBe(0);
    });
  });

  describe("clear", () => {
    it("removes all entries", () => {
      memoryCache.set("a", 1);
      memoryCache.set("b", 2);
      memoryCache.set("c", 3);
      memoryCache.clear();

      expect(memoryCache.get("a")).toBeNull();
      expect(memoryCache.get("b")).toBeNull();
      expect(memoryCache.get("c")).toBeNull();
    });
  });

  describe("getStats", () => {
    it("tracks hits and misses", () => {
      memoryCache.set("key", "val");
      memoryCache.get("key");
      memoryCache.get("key");
      memoryCache.get("miss");

      const stats = memoryCache.getStats();
      expect(stats.hits).toBeGreaterThanOrEqual(2);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
      expect(stats.sets).toBeGreaterThanOrEqual(1);
    });

    it("calculates hit rate", () => {
      memoryCache.clear();
      memoryCache.set("x", 1);
      memoryCache.get("x");

      const stats = memoryCache.getStats();
      expect(stats.hitRate).toMatch(/\d+(\.\d+)?%/);
    });
  });

  describe("getOrSet", () => {
    it("returns cached value if available", async () => {
      memoryCache.set("cached", "existing");
      const fetcher = vi.fn().mockResolvedValue("fresh");

      const result = await memoryCache.getOrSet("cached", fetcher);
      expect(result).toBe("existing");
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("calls fetcher and caches value on miss", async () => {
      const fetcher = vi.fn().mockResolvedValue("fresh-data");

      const result = await memoryCache.getOrSet("new-key", fetcher);
      expect(result).toBe("fresh-data");
      expect(fetcher).toHaveBeenCalledOnce();
      expect(memoryCache.get("new-key")).toBe("fresh-data");
    });
  });

  describe("helper functions", () => {
    it("getCached works", () => {
      setCached("helper-key", "helper-value");
      expect(getCached("helper-key")).toBe("helper-value");
    });

    it("invalidateCache works", () => {
      setCached("to-invalidate", "val");
      expect(invalidateCache("to-invalidate")).toBe(true);
      expect(getCached("to-invalidate")).toBeNull();
    });

    it("invalidateCacheByPrefix works", () => {
      setCached("prefix:a", 1);
      setCached("prefix:b", 2);
      expect(invalidateCacheByPrefix("prefix:")).toBe(2);
    });
  });

  describe("CACHE_TTL constants", () => {
    it("has expected keys", () => {
      expect(CACHE_TTL.FOLDER_CONTENT).toBe(60_000);
      expect(CACHE_TTL.FOLDER_PATH).toBe(300_000);
      expect(CACHE_TTL.FILE_DETAILS).toBe(120_000);
      expect(CACHE_TTL.PROTECTED_FOLDERS).toBe(60_000);
      expect(CACHE_TTL.USER_ACCESS).toBe(30_000);
      expect(CACHE_TTL.CONFIG).toBe(300_000);
      expect(CACHE_TTL.SHARE_TOKEN).toBe(60_000);
    });
  });
});
