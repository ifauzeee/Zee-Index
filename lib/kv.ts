import { createClient, VercelKV } from "@vercel/kv";

const hasKvEnv =
  !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

class InMemoryKV {
  private store = new Map<string, any>();

  async get<T>(key: string): Promise<T | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: any, opts?: any): Promise<string> {
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
}

export const kv = hasKvEnv
  ? createClient({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  })
  : (new InMemoryKV() as unknown as VercelKV);

