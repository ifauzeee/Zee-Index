import { db } from "@/lib/db";
import { kv } from "@/lib/kv";
import { logger } from "@/lib/logger";
import { revokeSessions } from "@/lib/session-version";

/**
 * Durable storage for user credentials: password hashes and TOTP state.
 *
 * These used to live only in Redis, which also serves as an LRU cache, so
 * memory pressure or a flush could silently drop them and turn 2FA off for a
 * user (audit Z2-02). Postgres is now the source of truth. Values still in
 * Redis from older versions are copied to the user row on first access and
 * then removed from Redis.
 */

const LEGACY_KEYS = {
  password: (email: string) => `password:${email}`,
  twoFactorSecret: (email: string) => `2fa:secret:${email}`,
  twoFactorEnabled: (email: string) => `2fa:enabled:${email}`,
};

export interface TwoFactorState {
  enabled: boolean;
  secret: string | null;
}

interface CredentialRow {
  passwordHash: string | null;
  twoFactorSecret: string | null;
  twoFactorEnabled: boolean;
}

const credentialSelect = {
  passwordHash: true,
  twoFactorSecret: true,
  twoFactorEnabled: true,
  credentialsMigratedAt: true,
} as const;

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Read a user's credentials, migrating legacy Redis values on first access.
 * Returns null when the user has neither a row nor legacy credentials.
 * Throws when Redis cannot be read during migration, so callers fail closed
 * instead of treating "unknown" as "no 2FA".
 */
async function loadCredentials(email: string): Promise<CredentialRow | null> {
  const row = await db.user.findUnique({
    where: { email },
    select: credentialSelect,
  });
  if (row?.credentialsMigratedAt) return row;

  const [legacyPassword, legacySecret, legacyEnabled] = await Promise.all([
    kv.get<string>(LEGACY_KEYS.password(email)),
    kv.get<string>(LEGACY_KEYS.twoFactorSecret(email)),
    kv.get<unknown>(LEGACY_KEYS.twoFactorEnabled(email)),
  ]);

  const hasLegacy = !!(legacyPassword || legacySecret || legacyEnabled);
  if (!row && !hasLegacy) return null;

  const migrated = {
    // Values already written to Postgres win over stale Redis copies.
    passwordHash: row?.passwordHash ?? legacyPassword ?? null,
    twoFactorSecret: row?.twoFactorSecret ?? legacySecret ?? null,
    twoFactorEnabled:
      (row?.twoFactorEnabled ?? false) || (!!legacyEnabled && !!legacySecret),
    credentialsMigratedAt: new Date(),
  };

  const saved = await db.user.upsert({
    where: { email },
    create: { email, name: email.split("@")[0], ...migrated },
    update: migrated,
    select: credentialSelect,
  });

  if (hasLegacy) {
    logger.info({ email }, "[Credentials] Migrated legacy Redis credentials");
  }
  await kv
    .del(
      LEGACY_KEYS.password(email),
      LEGACY_KEYS.twoFactorSecret(email),
      LEGACY_KEYS.twoFactorEnabled(email),
    )
    .catch((err: unknown) =>
      logger.warn(
        { err, email },
        "[Credentials] Failed to delete migrated Redis keys",
      ),
    );

  return saved;
}

export async function getPasswordHash(email: string): Promise<string | null> {
  const row = await loadCredentials(normalizeEmail(email));
  return row?.passwordHash ?? null;
}

export async function setPasswordHash(
  email: string,
  passwordHash: string | null,
): Promise<void> {
  const normalized = normalizeEmail(email);
  await loadCredentials(normalized);
  await db.user.upsert({
    where: { email: normalized },
    create: {
      email: normalized,
      name: normalized.split("@")[0],
      passwordHash,
      credentialsMigratedAt: new Date(),
    },
    update: { passwordHash },
  });
  // A new or removed password must not leave old sessions signed in.
  await revokeSessions(normalized);
}

export async function getTwoFactorState(
  email: string,
): Promise<TwoFactorState> {
  const row = await loadCredentials(normalizeEmail(email));
  return {
    enabled: !!row?.twoFactorEnabled && !!row.twoFactorSecret,
    secret: row?.twoFactorSecret ?? null,
  };
}

export async function enableTwoFactor(
  email: string,
  secret: string,
): Promise<void> {
  const normalized = normalizeEmail(email);
  await loadCredentials(normalized);
  await db.user.upsert({
    where: { email: normalized },
    create: {
      email: normalized,
      name: normalized.split("@")[0],
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      credentialsMigratedAt: new Date(),
    },
    update: { twoFactorSecret: secret, twoFactorEnabled: true },
  });
  // Sessions opened before 2FA existed never passed it.
  await revokeSessions(normalized);
}

export async function disableTwoFactor(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await loadCredentials(normalized);
  await db.user.updateMany({
    where: { email: normalized },
    data: { twoFactorSecret: null, twoFactorEnabled: false },
  });
  await revokeSessions(normalized);
}
