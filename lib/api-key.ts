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

interface CachedApiKey extends ApiKeyData {
  expiresAt: string | null;
}

/** SHA-256 of the full key (Web Crypto, so it also runs in the middleware). */
async function hashForCache(rawKey: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawKey),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

function cacheKeyFor(fullKeyHash: string): string {
  return `${REDIS_KEYS.API_KEY_CACHE}${fullKeyHash}`;
}

function cacheIndexKeyFor(keyId: string): string {
  return `${REDIS_KEYS.API_KEY_CACHE}id:${keyId}`;
}

/**
 * Validate an API key from an Authorization header value (without "Bearer " prefix).
 * Returns key metadata on success, or null if invalid/revoked/expired.
 *
 * The cache is keyed by a hash of the whole key. It used to be keyed by the
 * 8-character prefix, so after one valid use any token sharing that prefix
 * was accepted without a hash check (audit Z2-09).
 */
export async function validateApiKey(
  rawKey: string,
): Promise<ApiKeyData | null> {
  const prefix = rawKey.slice(0, KEY_PREFIX_LEN);
  const cacheKey = cacheKeyFor(await hashForCache(rawKey));

  // Fast path: only a key that already passed the bcrypt check is cached.
  try {
    const cached = await kv.get<CachedApiKey>(cacheKey);
    if (cached) {
      if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
        return null;
      }
      return {
        id: cached.id,
        name: cached.name,
        permissions: cached.permissions,
      };
    }
  } catch {
    // Cache miss — proceed to DB
  }

  // Slow path: DB lookup by prefix, then verify the whole key.
  try {
    const record = await db.apiKey.findUnique({ where: { keyPrefix: prefix } });
    if (!record || record.revoked) return null;
    if (record.expiresAt && record.expiresAt < new Date()) return null;

    const bcrypt = await import("bcryptjs");
    if (!(await bcrypt.compare(rawKey, record.keyHash))) return null;

    // Fire-and-forget: update lastUsedAt
    db.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    const data: CachedApiKey = {
      id: record.id,
      name: record.name,
      permissions: parsePermissions(record.permissions),
      expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
    };

    // Populate the cache, plus an index so revoking by id can clear it.
    await Promise.all([
      kv.set(cacheKey, data, { ex: KEY_CACHE_TTL }),
      kv.set(cacheIndexKeyFor(record.id), cacheKey, { ex: KEY_CACHE_TTL }),
    ]).catch(() => {});

    return { id: data.id, name: data.name, permissions: data.permissions };
  } catch (err) {
    logger.error({ err }, "API key validation failed");
    return null;
  }
}

/** Drop the cached validation for a key (used when revoking / updating). */
export async function clearApiKeyCache(keyId: string): Promise<void> {
  const indexKey = cacheIndexKeyFor(keyId);
  try {
    const cacheKey = await kv.get<string>(indexKey);
    await kv.del(...(cacheKey ? [cacheKey, indexKey] : [indexKey]));
  } catch {
    // Best effort: the entry still expires after KEY_CACHE_TTL.
  }
}
