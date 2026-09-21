import { kv } from "@/lib/kv";
import { db } from "@/lib/db";

export interface WatchProgress {
  fileId: string;
  fileName: string;
  mimeType: string | null;
  folderId: string | null;
  position: number;
  duration: number;
  updatedAt: number;
}

export const MAX_WATCH_ITEMS = 25;
const WATCH_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 days

function userKey(email: string) {
  return `watch:progress:${email.toLowerCase()}`;
}

function orderKey(email: string) {
  return `${userKey(email)}:order`;
}

interface WatchEntry {
  fileName: string;
  position: number;
  duration: number;
  updatedAt: number;
}

function parseEntry(fileId: string, raw: string): WatchEntry | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WatchEntry>;
    if (
      typeof parsed.position !== "number" ||
      typeof parsed.fileName !== "string"
    ) {
      return null;
    }
    return {
      fileName: parsed.fileName,
      position: parsed.position,
      duration: typeof parsed.duration === "number" ? parsed.duration : 0,
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export async function getWatchProgressList(
  email: string,
): Promise<WatchProgress[]> {
  const [hash, ids] = await Promise.all([
    kv.hgetall<Record<string, string>>(userKey(email)),
    kv.zrange<string>(orderKey(email), 0, MAX_WATCH_ITEMS - 1, { rev: true }),
  ]);
  if (!hash) return [];

  const entries: WatchProgress[] = [];
  const fileIds: string[] = [];

  for (const id of ids) {
    const raw = hash[id];
    if (!raw) continue;
    const entry = parseEntry(id, raw);
    if (!entry || entry.position <= 5) continue;
    fileIds.push(id);
    entries.push({
      fileId: id,
      fileName: entry.fileName,
      mimeType: null,
      folderId: null,
      position: entry.position,
      duration: entry.duration,
      updatedAt: entry.updatedAt,
    });
  }

  if (entries.length > 0) {
    const indexed = await db.fileIndex.findMany({
      where: { id: { in: fileIds } },
      select: { id: true, mimeType: true, folderId: true },
    });
    const fileMap = new Map(indexed.map((f) => [f.id, f]));
    for (const entry of entries) {
      const meta = fileMap.get(entry.fileId);
      entry.mimeType = meta?.mimeType ?? null;
      entry.folderId = meta?.folderId ?? null;
    }
  }

  return entries;
}

export async function upsertWatchProgress(
  email: string,
  input: {
    fileId: string;
    fileName: string;
    position: number;
    duration?: number;
  },
): Promise<void> {
  const key = userKey(email);
  const order = orderKey(email);
  const now = Date.now();
  const entry: WatchEntry = {
    fileName: input.fileName,
    position: input.position,
    duration: input.duration ?? 0,
    updatedAt: now,
  };

  await kv.hset(key, { [input.fileId]: JSON.stringify(entry) });
  await kv.zadd(order, { score: now, member: input.fileId });
  await kv.expire(key, WATCH_TTL_SECONDS);
  await kv.expire(order, WATCH_TTL_SECONDS);

  const total = await kv.zcard(order);
  if (total > MAX_WATCH_ITEMS) {
    const keep = new Set(
      await kv.zrange<string>(order, total - MAX_WATCH_ITEMS, -1),
    );
    const all = await kv.zrange<string>(order, 0, -1);
    const drop = all.filter((id) => !keep.has(id));
    if (drop.length > 0) {
      await kv.hdel(key, ...drop);
      await kv.zrem(order, ...drop);
    }
  }
}
