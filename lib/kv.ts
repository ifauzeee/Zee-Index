import { memoryCache, CACHE_TTL } from "./memory-cache";


const isEdgeRuntime =
  typeof globalThis !== "undefined" &&
  (globalThis as any).EdgeRuntime !== undefined;

const redisUrl = typeof process !== "undefined" ? process.env?.REDIS_URL : undefined;

if (typeof window === "undefined" && !isEdgeRuntime) {
  if (redisUrl) {
    console.log("[KV] Connecting to Redis...");
  } else {
    console.log(
      "[KV] Using in-memory store (data will not persist across restarts)",
    );
  }
}

export interface KVClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ex?: number }): Promise<string>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  mget<T>(...keys: string[]): Promise<(T | null)[]>;
  mset(keyValues: Record<string, unknown>): Promise<string>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  hgetall<T>(key: string): Promise<T | null>;
  hset(key: string, obj: Record<string, unknown>): Promise<number>;
  hget<T>(key: string, field: string): Promise<T | null>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  sadd(key: string, ...members: unknown[]): Promise<number>;
  srem(key: string, ...members: unknown[]): Promise<number>;
  sismember(key: string, member: unknown): Promise<number>;
  smembers(key: string): Promise<string[]>;
  scard(key: string): Promise<number>;
  zadd(
    key: string,
    options: { score: number; member: string },
  ): Promise<number>;
  zrange<T>(
    key: string,
    start: number,
    stop: number,
    options?: { rev?: boolean; byScore?: boolean },
  ): Promise<T[]>;
  zremrangebyscore(key: string, min: number, max: number): Promise<number>;
  zcard(key: string): Promise<number>;
  zrem(key: string, ...members: string[]): Promise<number>;
  zscore(key: string, member: string): Promise<number | null>;
  lpush(key: string, ...values: unknown[]): Promise<number>;
  rpush(key: string, ...values: unknown[]): Promise<number>;
  lrange<T>(key: string, start: number, stop: number): Promise<T[]>;
  llen(key: string): Promise<number>;
  flushall(): Promise<string>;
  pipeline(): any;
}


let RedisClient: any = null;

function getRedisConstructor() {
  if (!RedisClient) {

    RedisClient = require("ioredis");
  }
  return RedisClient;
}

class RedisKV implements KVClient {
  private client: any;

  constructor(url: string) {
    const IORedis = getRedisConstructor();
    this.client = new IORedis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: false,
      enableReadyCheck: true,
    });

    this.client.on("connect", () => {
      console.log("[KV] Redis connected successfully");
    });

    this.client.on("error", (err: Error) => {
      console.error("[KV] Redis connection error:", err.message);
    });
  }

  private serialize(value: unknown): string {
    return JSON.stringify(value);
  }

  private deserialize<T>(value: string | null): T | null {
    if (value === null || value === undefined) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = memoryCache.get<T>(`kv:${key}`);
    if (cached !== null) return cached;

    const value = await this.client.get(key);
    const parsed = this.deserialize<T>(value);
    if (parsed !== null) {
      memoryCache.set(`kv:${key}`, parsed, CACHE_TTL.FOLDER_CONTENT);
    }
    return parsed;
  }

  async set(
    key: string,
    value: unknown,
    options?: { ex?: number },
  ): Promise<string> {
    const serialized = this.serialize(value);
    if (options?.ex) {
      await this.client.setex(key, options.ex, serialized);
    } else {
      await this.client.set(key, serialized);
    }
    memoryCache.set(`kv:${key}`, value, (options?.ex ?? 3600) * 1000);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    for (const key of keys) {
      memoryCache.delete(`kv:${key}`);
      memoryCache.delete(`kv:hash:${key}`);
    }
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }

  async exists(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.exists(...keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    const values = await this.client.mget(...keys);
    return values.map((v: string | null) => this.deserialize<T>(v));
  }

  async mset(keyValues: Record<string, unknown>): Promise<string> {
    const flat: string[] = [];
    for (const [key, value] of Object.entries(keyValues)) {
      flat.push(key, this.serialize(value));
      memoryCache.set(`kv:${key}`, value, CACHE_TTL.FOLDER_CONTENT);
    }
    if (flat.length === 0) return "OK";
    await this.client.mset(...flat);
    return "OK";
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }

  async hgetall<T>(key: string): Promise<T | null> {
    const cached = memoryCache.get<T>(`kv:hash:${key}`);
    if (cached !== null) return cached;

    const data = await this.client.hgetall(key);
    if (!data || Object.keys(data).length === 0) return null;


    const parsed: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(data)) {
      try {
        parsed[field] = JSON.parse(value as string);
      } catch {
        parsed[field] = value;
      }
    }

    const result = parsed as T;
    memoryCache.set(`kv:hash:${key}`, result, CACHE_TTL.PROTECTED_FOLDERS);
    return result;
  }

  async hset(key: string, obj: Record<string, unknown>): Promise<number> {
    const serialized: Record<string, string> = {};
    for (const [field, value] of Object.entries(obj)) {
      serialized[field] = this.serialize(value);
    }
    memoryCache.delete(`kv:hash:${key}`);
    return await this.client.hset(key, serialized);
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(key, field);
    return this.deserialize<T>(value);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    memoryCache.delete(`kv:hash:${key}`);
    if (fields.length === 0) return 0;
    return await this.client.hdel(key, ...fields);
  }

  async sadd(key: string, ...members: unknown[]): Promise<number> {
    if (members.length === 0) return 0;
    const serialized = members.map((m) =>
      typeof m === "string" ? m : this.serialize(m),
    );
    return await this.client.sadd(key, ...serialized);
  }

  async srem(key: string, ...members: unknown[]): Promise<number> {
    if (members.length === 0) return 0;
    const serialized = members.map((m) =>
      typeof m === "string" ? m : this.serialize(m),
    );
    return await this.client.srem(key, ...serialized);
  }

  async sismember(key: string, member: unknown): Promise<number> {
    const cacheKey = `kv:sismember:${key}:${String(member)}`;
    const cached = memoryCache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const serialized =
      typeof member === "string" ? member : this.serialize(member);
    const result = await this.client.sismember(key, serialized);
    memoryCache.set(cacheKey, result, CACHE_TTL.USER_ACCESS);
    return result;
  }

  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key);
  }

  async scard(key: string): Promise<number> {
    return await this.client.scard(key);
  }

  async zadd(
    key: string,
    options: { score: number; member: string },
  ): Promise<number> {
    return await this.client.zadd(key, options.score, options.member);
  }

  async zrange<T>(
    key: string,
    start: number,
    stop: number,
    options?: { rev?: boolean; byScore?: boolean },
  ): Promise<T[]> {
    let results: string[];

    if (options?.byScore) {
      if (options?.rev) {
        results = await this.client.zrevrangebyscore(key, stop, start);
      } else {
        results = await this.client.zrangebyscore(key, start, stop);
      }
    } else {
      if (options?.rev) {
        results = await this.client.zrevrange(key, start, stop);
      } else {
        results = await this.client.zrange(key, start, stop);
      }
    }

    return results.map((member: string) => {
      try {
        return JSON.parse(member) as T;
      } catch {
        return member as unknown as T;
      }
    });
  }

  async zremrangebyscore(
    key: string,
    min: number,
    max: number,
  ): Promise<number> {
    return await this.client.zremrangebyscore(key, min, max);
  }

  async zcard(key: string): Promise<number> {
    return await this.client.zcard(key);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return await this.client.zrem(key, ...members);
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const score = await this.client.zscore(key, member);
    return score !== null ? parseFloat(score) : null;
  }

  async lpush(key: string, ...values: unknown[]): Promise<number> {
    if (values.length === 0) return 0;
    const serialized = values.map((v) => this.serialize(v));
    return await this.client.lpush(key, ...serialized);
  }

  async rpush(key: string, ...values: unknown[]): Promise<number> {
    if (values.length === 0) return 0;
    const serialized = values.map((v) => this.serialize(v));
    return await this.client.rpush(key, ...serialized);
  }

  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const values = await this.client.lrange(key, start, stop);
    return values.map((v: string) => this.deserialize<T>(v)!);
  }

  async llen(key: string): Promise<number> {
    return await this.client.llen(key);
  }

  async flushall(): Promise<string> {
    await this.client.flushall();
    return "OK";
  }

  pipeline() {
    const pipe = this.client.pipeline();
    const self = this;
    return {
      sismember: (key: string, member: unknown) => {
        const serialized =
          typeof member === "string" ? member : JSON.stringify(member);
        pipe.sismember(key, serialized);
        return self;
      },
      exec: async () => {
        const results = await pipe.exec();
        return results?.map(([, val]: [any, any]) => val) || [];
      },
    };
  }
}


class InMemoryKV implements KVClient {
  pipeline() {
    const results: any[] = [];
    const commands: any[] = [];
    return {
      sismember: (key: string, member: unknown) => {
        commands.push(async () => {
          const res = await this.sismember(key, member);
          results.push(res);
        });
        return this;
      },
      exec: async () => {
        for (const cmd of commands) await cmd();
        return results;
      },
    };
  }
  private store = new Map<string, unknown>();
  private expirations = new Map<string, ReturnType<typeof setTimeout>>();
  private hashStore = new Map<string, Map<string, unknown>>();
  private setStore = new Map<string, Set<unknown>>();
  private sortedSets = new Map<string, Map<string, number>>();

  async get<T>(key: string): Promise<T | null> {
    const cached = memoryCache.get<T>(`kv:${key}`);
    if (cached !== null) return cached;

    const value = (this.store.get(key) as T) ?? null;
    if (value !== null) {
      memoryCache.set(`kv:${key}`, value, CACHE_TTL.FOLDER_CONTENT);
    }
    return value;
  }

  async set(
    key: string,
    value: unknown,
    options?: { ex?: number },
  ): Promise<string> {
    this.store.set(key, value);
    memoryCache.set(`kv:${key}`, value, (options?.ex ?? 3600) * 1000);

    const existingTimer = this.expirations.get(key);
    if (existingTimer) clearTimeout(existingTimer);

    if (options?.ex) {

      const timeoutMs = Math.min(options.ex * 1000, 2_147_483_647);
      const timer = setTimeout(() => {
        this.store.delete(key);
        memoryCache.delete(`kv:${key}`);
        this.expirations.delete(key);
      }, timeoutMs);
      if (typeof timer === "object" && timer.unref) timer.unref();
      this.expirations.set(key, timer);
    }
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deleted++;
      if (this.hashStore.delete(key)) deleted++;
      if (this.setStore.delete(key)) deleted++;
      this.sortedSets.delete(key);
      memoryCache.delete(`kv:${key}`);
      memoryCache.delete(`kv:hash:${key}`);

      const timer = this.expirations.get(key);
      if (timer) {
        clearTimeout(timer);
        this.expirations.delete(key);
      }
    }
    return deleted;
  }

  async exists(...keys: string[]): Promise<number> {
    return keys.filter(
      (key) =>
        this.store.has(key) ||
        this.hashStore.has(key) ||
        this.setStore.has(key) ||
        this.sortedSets.has(key),
    ).length;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    );
    const allKeys = new Set([
      ...this.store.keys(),
      ...this.hashStore.keys(),
      ...this.setStore.keys(),
      ...this.sortedSets.keys(),
    ]);
    return Array.from(allKeys).filter((key) => regex.test(key));
  }

  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    return keys.map((key) => (this.store.get(key) as T) ?? null);
  }

  async mset(keyValues: Record<string, unknown>): Promise<string> {
    for (const [key, value] of Object.entries(keyValues)) {
      this.store.set(key, value);
      memoryCache.set(`kv:${key}`, value, CACHE_TTL.FOLDER_CONTENT);
    }
    return "OK";
  }

  async incr(key: string): Promise<number> {
    const val = Number(this.store.get(key) || 0);
    const newVal = val + 1;
    this.store.set(key, newVal);
    return newVal;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (
      !this.store.has(key) &&
      !this.hashStore.has(key) &&
      !this.setStore.has(key) &&
      !this.sortedSets.has(key)
    ) {
      return 0;
    }

    const existingTimer = this.expirations.get(key);
    if (existingTimer) clearTimeout(existingTimer);


    const timeoutMs = Math.min(seconds * 1000, 2_147_483_647);
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.hashStore.delete(key);
      this.setStore.delete(key);
      this.sortedSets.delete(key);
      memoryCache.delete(`kv:${key}`);
      memoryCache.delete(`kv:hash:${key}`);
      this.expirations.delete(key);
    }, timeoutMs);
    if (typeof timer === "object" && timer.unref) timer.unref();
    this.expirations.set(key, timer);
    return 1;
  }

  async hgetall<T>(key: string): Promise<T | null> {
    const cached = memoryCache.get<T>(`kv:hash:${key}`);
    if (cached !== null) return cached;

    const hash = this.hashStore.get(key);
    if (!hash) return null;

    const result = Object.fromEntries(hash) as T;
    memoryCache.set(`kv:hash:${key}`, result, CACHE_TTL.PROTECTED_FOLDERS);
    return result;
  }

  async hset(key: string, obj: Record<string, unknown>): Promise<number> {
    let hash = this.hashStore.get(key);
    if (!hash) {
      hash = new Map();
      this.hashStore.set(key, hash);
    }

    for (const [field, value] of Object.entries(obj)) {
      hash.set(field, value);
    }

    memoryCache.delete(`kv:hash:${key}`);
    return Object.keys(obj).length;
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    const hash = this.hashStore.get(key);
    return (hash?.get(field) as T) ?? null;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.hashStore.get(key);
    if (!hash) return 0;

    let deleted = 0;
    for (const field of fields) {
      if (hash.delete(field)) deleted++;
    }

    memoryCache.delete(`kv:hash:${key}`);
    return deleted;
  }

  async sadd(key: string, ...members: unknown[]): Promise<number> {
    let set = this.setStore.get(key);
    if (!set) {
      set = new Set();
      this.setStore.set(key, set);
    }

    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    return added;
  }

  async srem(key: string, ...members: unknown[]): Promise<number> {
    const set = this.setStore.get(key);
    if (!set) return 0;

    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) removed++;
    }
    return removed;
  }

  async sismember(key: string, member: unknown): Promise<number> {
    const cacheKey = `kv:sismember:${key}:${String(member)}`;
    const cached = memoryCache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const set = this.setStore.get(key);
    const result = set?.has(member) ? 1 : 0;
    memoryCache.set(cacheKey, result, CACHE_TTL.USER_ACCESS);
    return result;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.setStore.get(key);
    return set ? (Array.from(set) as string[]) : [];
  }

  async scard(key: string): Promise<number> {
    const set = this.setStore.get(key);
    return set?.size ?? 0;
  }

  async zadd(
    key: string,
    options: { score: number; member: string },
  ): Promise<number> {
    let zset = this.sortedSets.get(key);
    if (!zset) {
      zset = new Map();
      this.sortedSets.set(key, zset);
    }

    const isNew = !zset.has(options.member);
    zset.set(options.member, options.score);
    return isNew ? 1 : 0;
  }

  async zrange<T>(
    key: string,
    start: number,
    stop: number,
    options?: { rev?: boolean; byScore?: boolean },
  ): Promise<T[]> {
    const zset = this.sortedSets.get(key);
    if (!zset) return [];

    let entries = Array.from(zset.entries()).sort((a, b) => a[1] - b[1]);

    if (options?.byScore) {
      entries = entries.filter(([, score]) => score >= start && score <= stop);
    }

    if (options?.rev) {
      entries = entries.reverse();
    }

    if (!options?.byScore) {
      const len = entries.length;
      const startIdx = start < 0 ? Math.max(0, len + start) : start;
      const endIdx = stop < 0 ? len + stop + 1 : stop + 1;
      entries = entries.slice(startIdx, endIdx);
    }

    return entries.map(([member]) => {
      try {
        return JSON.parse(member) as T;
      } catch {
        return member as unknown as T;
      }
    });
  }

  async zremrangebyscore(
    key: string,
    min: number,
    max: number,
  ): Promise<number> {
    const zset = this.sortedSets.get(key);
    if (!zset) return 0;

    let removed = 0;
    for (const [member, score] of zset.entries()) {
      if (score >= min && score <= max) {
        zset.delete(member);
        removed++;
      }
    }
    return removed;
  }

  async zcard(key: string): Promise<number> {
    const zset = this.sortedSets.get(key);
    return zset?.size ?? 0;
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    const zset = this.sortedSets.get(key);
    if (!zset) return 0;

    let removed = 0;
    for (const member of members) {
      if (zset.delete(member)) removed++;
    }
    return removed;
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const zset = this.sortedSets.get(key);
    return zset?.get(member) ?? null;
  }

  async lpush(key: string, ...values: unknown[]): Promise<number> {
    let list = this.store.get(key) as unknown[] | undefined;
    if (!Array.isArray(list)) {
      list = [];
      this.store.set(key, list);
    }
    list.unshift(...values);
    return list.length;
  }

  async rpush(key: string, ...values: unknown[]): Promise<number> {
    let list = this.store.get(key) as unknown[] | undefined;
    if (!Array.isArray(list)) {
      list = [];
      this.store.set(key, list);
    }
    list.push(...values);
    return list.length;
  }

  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const list = this.store.get(key) as unknown[] | undefined;
    if (!Array.isArray(list)) return [];

    const end = stop < 0 ? list.length + stop + 1 : stop + 1;
    return list.slice(start, end) as T[];
  }

  async llen(key: string): Promise<number> {
    const list = this.store.get(key) as unknown[] | undefined;
    return Array.isArray(list) ? list.length : 0;
  }

  async flushall(): Promise<string> {
    this.store.clear();
    this.hashStore.clear();
    this.setStore.clear();
    this.sortedSets.clear();
    for (const timer of this.expirations.values()) {
      clearTimeout(timer);
    }
    this.expirations.clear();
    return "OK";
  }

  getStats() {
    return {
      stringKeys: this.store.size,
      hashKeys: this.hashStore.size,
      setKeys: this.setStore.size,
      totalKeys: this.store.size + this.hashStore.size + this.setStore.size,
      expiringKeys: this.expirations.size,
    };
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
      console.error("[KV] Failed to initialize Redis, falling back to in-memory:", err);
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
    kv: redisUrl && !isEdgeRuntime
      ? { type: "redis" }
      : (kv as unknown as InMemoryKV).getStats(),
    memoryCache: memoryCache.getStats(),
  };
}

export function getKvCacheStats() {
  return memoryCache.getStats();
}

export type VercelKV = KVClient;
