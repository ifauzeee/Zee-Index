import { memoryCache, CACHE_TTL } from "../memory-cache";
import { logger } from "../logger";
import type { KVClient, KVPipeline } from "./types";

let RedisClient: unknown = null;

interface RedisPipelineResult extends Array<unknown> {
  0: Error | null;
  1: unknown;
}

interface RedisPipelineClient {
  sismember(key: string, member: string): RedisPipelineClient;
  exec(): Promise<RedisPipelineResult[] | null>;
}

interface RedisClientLike {
  on(event: "connect", listener: () => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  set(key: string, value: string): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  mget(...keys: string[]): Promise<Array<string | null>>;
  mset(...values: string[]): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  hset(key: string, obj: Record<string, string>): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  sismember(key: string, member: string): Promise<number>;
  smembers(key: string): Promise<string[]>;
  scard(key: string): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrevrangebyscore(key: string, stop: number, start: number): Promise<string[]>;
  zrangebyscore(key: string, start: number, stop: number): Promise<string[]>;
  zrevrange(key: string, start: number, stop: number): Promise<string[]>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  zremrangebyscore(key: string, min: number, max: number): Promise<number>;
  zcard(key: string): Promise<number>;
  zrem(key: string, ...members: string[]): Promise<number>;
  zscore(key: string, member: string): Promise<string | null>;
  lpush(key: string, ...values: string[]): Promise<number>;
  rpush(key: string, ...values: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  llen(key: string): Promise<number>;
  ltrim(key: string, start: number, stop: number): Promise<string>;
  flushall(): Promise<unknown>;
  pipeline(): RedisPipelineClient;
}

interface RedisConstructor {
  new (
    url: string,
    options: {
      maxRetriesPerRequest: number;
      retryStrategy: (times: number) => number | null;
      lazyConnect: boolean;
      enableReadyCheck: boolean;
    },
  ): RedisClientLike;
}

function getRedisConstructor(): RedisConstructor {
  if (!RedisClient) {
    RedisClient = require("ioredis");
  }
  return RedisClient as RedisConstructor;
}

export class RedisKV implements KVClient {
  private client: RedisClientLike;

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
      logger.info("[KV] Redis connected successfully");
    });

    this.client.on("error", (err: Error) => {
      logger.error({ err }, "[KV] Redis connection error");
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

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    return await this.client.ltrim(key, start, stop);
  }

  async flushall(): Promise<string> {
    await this.client.flushall();
    return "OK";
  }

  pipeline(): KVPipeline {
    const pipe = this.client.pipeline();
    const pipelineWrapper: KVPipeline = {
      sismember: (key: string, member: unknown) => {
        const serialized =
          typeof member === "string" ? member : JSON.stringify(member);
        pipe.sismember(key, serialized);
        return pipelineWrapper;
      },
      exec: async () => {
        const results = await pipe.exec();
        return results?.map(([, value]) => value) || [];
      },
    };
    return pipelineWrapper;
  }
}
