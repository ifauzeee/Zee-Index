import { db } from "@/lib/db";
import { kv } from "@/lib/kv";
import { REDIS_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";

const KEY_PREFIX_LEN = 8;
const KEY_CACHE_TTL = 300; // 5 min

export interface ApiKeyData {
  id: string;
  name: string;
  permissions: string[];
}

/**
 * The ApiKey.permissions column is `String[]` on Postgres but a JSON-encoded
 * `String` on SQLite (desktop sidecar). Normalize both directions here so the
 * rest of the app always works with `string[]`.
 */
export function parsePermissions(raw: unknown): string[] {
  if (Array.isArray(raw))
    return raw.filter((p): p is string => typeof p === "string");
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed))
        return parsed.filter((p): p is string => typeof p === "string");
    } catch {
      // Not JSON — fall through to [] (never pass garbage downstream).
    }
    return [];
  }
  return [];
}

/**
 * Serialize for storage. SQLite stores a JSON string; Postgres stores a native
 * array. Provider is inferred from DATABASE_URL (`file:` ⇒ SQLite).
 */
export function serializePermissions(permissions: string[]): string[] | string {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("file:") ? JSON.stringify(permissions) : permissions;
}

/**
 * Generate a new API key pair.
 * Returns the raw key (shown once to the admin) and the hash (stored in DB).
 */
export function generateApiKey(): {
  raw: string;
  prefix: string;
  hash: string;
} {
  const raw =
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "");
  const prefix = raw.slice(0, KEY_PREFIX_LEN);

  // Dynamic import bcryptjs (avoids loading on every request)
  const bcrypt = require("bcryptjs");
  const hash = bcrypt.hashSync(raw, 10);

  return { raw, prefix, hash };
}

/**
 * Validate an API key from an Authorization header value (without "Bearer " prefix).
 * Returns key metadata on success, or null if invalid/revoked/expired.
 */
export async function validateApiKey(
  rawKey: string,
): Promise<ApiKeyData | null> {
  const prefix = rawKey.slice(0, KEY_PREFIX_LEN);
  const cacheKey = `${REDIS_KEYS.API_KEY_CACHE}${prefix}`;

  // Fast path: Redis cache
  try {
    const cached = await kv.get<ApiKeyData>(cacheKey);
    if (cached) return cached;
  } catch {
    // Cache miss — proceed to DB
  }

  // Slow path: DB lookup by prefix
  try {
    const record = await db.apiKey.findUnique({ where: { keyPrefix: prefix } });
    if (!record || record.revoked) return null;
    if (record.expiresAt && record.expiresAt < new Date()) return null;

    const bcrypt = require("bcryptjs");
    const match = bcrypt.compareSync(rawKey, record.keyHash);
    if (!match) return null;

    // Fire-and-forget: update lastUsedAt
    db.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    const data: ApiKeyData = {
      id: record.id,
      name: record.name,
      permissions: parsePermissions(record.permissions),
    };

    // Populate cache
    await kv.set(cacheKey, data, { ex: KEY_CACHE_TTL }).catch(() => {});

    return data;
  } catch (err) {
    logger.error({ err }, "API key validation failed");
    return null;
  }
}

/**
 * Invalidate the cache for a given key prefix (used when revoking / updating).
 */
export async function clearApiKeyCache(prefix: string): Promise<void> {
  const cacheKey = `${REDIS_KEYS.API_KEY_CACHE}${prefix}`;
  await kv.del(cacheKey).catch(() => {});
}
