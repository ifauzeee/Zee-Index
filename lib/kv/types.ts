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
  ltrim(key: string, start: number, stop: number): Promise<string>;
  flushall(): Promise<string>;
  pipeline(): {
    sismember(key: string, member: unknown): any;
    exec(): Promise<any[]>;
  };
}
