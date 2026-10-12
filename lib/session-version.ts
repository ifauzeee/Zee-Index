import { db } from "@/lib/db";
import { memoryCache } from "@/lib/memory-cache";

/**
 * Sessions are JWTs, so they cannot be deleted server-side. Each user has a
 * sessionVersion; a token records the version it was issued with and the
 * jwt callback rejects it once the version moves on (audit Z2-06). Bumping
 * the version signs the user out everywhere within CACHE_TTL_MS.
 */

const CACHE_PREFIX = "session-version:";
const CACHE_TTL_MS = 30_000;

const normalizeEmail = (email: string) => email.toLowerCase().trim();

/** The user's current session version, or null when the user row is gone. */
export async function getSessionVersion(email: string): Promise<number | null> {
  const normalized = normalizeEmail(email);
  const cacheKey = `${CACHE_PREFIX}${normalized}`;
  const cached = memoryCache.get<{ version: number | null }>(cacheKey);
  if (cached) return cached.version;

  const row = await db.user.findUnique({
    where: { email: normalized },
    select: { sessionVersion: true },
  });
  const version = row ? row.sessionVersion : null;
  memoryCache.set(cacheKey, { version }, CACHE_TTL_MS);
  return version;
}

/** Invalidate every session the user holds. */
export async function revokeSessions(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await db.user.updateMany({
    where: { email: normalized },
    data: { sessionVersion: { increment: 1 } },
  });
  memoryCache.delete(`${CACHE_PREFIX}${normalized}`);
}
