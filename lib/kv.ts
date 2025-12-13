import { createClient, VercelKV } from "@vercel/kv";
export type { VercelKV };

const hasKvEnv =
  !!process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_URL !== "" &&
  !!process.env.KV_REST_API_TOKEN &&
  process.env.KV_REST_API_TOKEN !== "";

class InMemoryKV {
  private store = new Map<string, any>();

  async get<T>(key: string): Promise<T | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: any): Promise<string> {
    this.store.set(key, value);
    return "OK";
  }

  async del(key: string): Promise<number> {
    const deleted = this.store.delete(key);
    return deleted ? 1 : 0;
  }

  async mset(obj: Record<string, any>): Promise<string> {
    Object.entries(obj).forEach(([k, v]) => this.store.set(k, v));
    return "OK";
  }

  async sadd(key: string, ...members: any[]): Promise<number> {
    const current = this.store.get(key) || new Set();
    const set = current instanceof Set ? current : new Set(current);
    let added = 0;
    members.forEach((m) => {
      if (!set.has(m)) {
        set.add(m);
        added++;
      }
    });
    this.store.set(key, set);
    return added;
  }

  async srem(key: string, ...members: any[]): Promise<number> {
    const current = this.store.get(key);
    if (!current || !(current instanceof Set)) return 0;
    let removed = 0;
    members.forEach((m) => {
      if (current.delete(m)) {
        removed++;
      }
    });
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    const current = this.store.get(key);
    if (!current || !(current instanceof Set)) return [];
    return Array.from(current);
  }

  async expire(key: string, seconds: number): Promise<number> {
    setTimeout(() => {
      this.store.delete(key);
    }, seconds * 1000);
    return 1;
  }

  async incr(key: string): Promise<number> {
    const val = Number(this.store.get(key) || 0);
    const newVal = val + 1;
    this.store.set(key, newVal);
    return newVal;
  }
}

export const kv = hasKvEnv
  ? createClient({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : (new InMemoryKV() as unknown as VercelKV);
