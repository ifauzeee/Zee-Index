import bcrypt from "bcryptjs";
import { kv } from "@/lib/kv";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { constantTimeEqual } from "@/lib/security";

export type UserRole = "ADMIN" | "EDITOR" | "USER";

const USER_PASSWORD_PREFIX = "password:";

export interface ManagedUser {
  email: string;
  role: UserRole;
  hasPassword: boolean;
  name?: string | null;
}

export async function setUserPassword(
  email: string,
  password: string,
): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const hash = await bcrypt.hash(password, 10);
  await kv.set(`${USER_PASSWORD_PREFIX}${normalized}`, hash);
}

function normalizeAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) =>
      e
        .trim()
        .toLowerCase()
        .replace(/^["']|["']$/g, ""),
    )
    .filter(Boolean);
}

export async function verifyUserPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const normalized = email.toLowerCase().trim();

  // 1. Check Redis-stored password (for users who set one via profile)
  const hash = await kv.get<string>(`${USER_PASSWORD_PREFIX}${normalized}`);
  if (hash) {
    try {
      if (await bcrypt.compare(password, hash)) return true;
    } catch (err) {
      logger.error(
        { err, email: normalized },
        "Failed to verify user password",
      );
    }
  }

  // 2. Check env var passwords (for admin users from ADMIN_PASSWORD/ADMIN_PASSWORD_HASH)
  if (normalizeAdminEmails().includes(normalized)) {
    const envPassHash = (process.env.ADMIN_PASSWORD_HASH || "")
      .trim()
      .replace(/^["']|["']$/g, "");
    if (envPassHash) {
      return bcrypt.compare(password, envPassHash);
    }
    const envPass = (process.env.ADMIN_PASSWORD || "")
      .trim()
      .replace(/^["']|["']$/g, "");
    if (envPass) {
      return constantTimeEqual(password, envPass);
    }
  }

  return false;
}

export async function hasUserPassword(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  const result = await kv.exists(`${USER_PASSWORD_PREFIX}${normalized}`);
  return result === 1;
}

export async function removeUserPassword(email: string): Promise<void> {
  const normalized = email.toLowerCase().trim();
  await kv.del(`${USER_PASSWORD_PREFIX}${normalized}`);
}

export async function upsertUser(
  email: string,
  role: UserRole,
  password?: string,
): Promise<ManagedUser> {
  const normalized = email.toLowerCase().trim();
  await db.user.upsert({
    where: { email: normalized },
    create: { email: normalized, role, name: normalized.split("@")[0] },
    update: { role },
  });
  if (password) await setUserPassword(normalized, password);

  return {
    email: normalized,
    role,
    hasPassword: password ? true : await hasUserPassword(normalized),
    name: normalized.split("@")[0],
  };
}

export async function listUsers(): Promise<ManagedUser[]> {
  const users = await db.user.findMany({ orderBy: { email: "asc" } });
  return Promise.all(
    users
      .filter((u) => u.email)
      .map(async (u) => ({
        email: u.email as string,
        role: u.role as UserRole,
        hasPassword: await hasUserPassword(u.email as string),
        name: u.name,
      })),
  );
}

export async function changeOwnPassword(
  email: string,
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const valid = await verifyUserPassword(normalized, currentPassword);
  if (!valid) {
    throw new Error("CURRENT_PASSWORD_INVALID");
  }
  await setUserPassword(normalized, nextPassword);
}
