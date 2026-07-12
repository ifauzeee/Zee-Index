import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";
import { db } from "@/lib/db";
import { memoryCache, CACHE_TTL } from "@/lib/memory-cache";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getPrivateFolderIds } from "@/lib/utils";
import { REDIS_KEYS } from "@/lib/constants";
import { getLocalStorageAuthSecret } from "@/lib/local-auth-secret";
import { logger } from "@/lib/logger";

export function isPrivateFolder(folderId: string): boolean {
  if (!folderId) return false;
  return getPrivateFolderIds().includes(folderId.trim());
}

export async function checkLocalStorageAccess(
  request: NextRequest,
): Promise<boolean> {
  const { getAppConfig } = await import("@/lib/app-config");
  const config = await getAppConfig();

  const dbProtected = await db.protectedFolder.findUnique({
    where: { folderId: "local-storage:" },
  });

  const isProtected = config.localStorageAuthEnabled || !!dbProtected;
  if (!isProtected) return true;

  const cookie = request.cookies.get("local_storage_token");
  if (!cookie) return false;

  const secret = getLocalStorageAuthSecret();
  if (!secret) return false;

  try {
    await jwtVerify(cookie.value, secret);
    return true;
  } catch {
    return false;
  }
}

export async function isProtected(folderId: string): Promise<boolean> {
  if (!folderId) return false;

  const targetId = folderId.trim();
  const cacheKey = `auth:protected:${targetId}`;

  const cached = memoryCache.get<boolean>(cacheKey);
  if (cached !== null) return cached;

  try {
    const protectedFolder = await db.protectedFolder.findUnique({
      where: { folderId: targetId },
    });

    const result = !!protectedFolder;

    memoryCache.set(cacheKey, result, CACHE_TTL.PROTECTED_FOLDERS);
    return result;
  } catch {
    return true;
  }
}

export async function getProtectedFolderCredentials(
  folderId: string,
): Promise<{ id: string; password: string } | null> {
  if (!folderId) return null;
  try {
    const targetId = folderId.trim();
    const folder = await db.protectedFolder.findUnique({
      where: { folderId: targetId },
    });

    if (folder && folder.password) {
      return { id: "admin", password: folder.password };
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifyFolderToken(
  token: string,
  requestedFolderId: string,
): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(token, secret);
    return payload.folderId === requestedFolderId?.trim();
  } catch {
    return false;
  }
}

export async function hasUserAccess(
  email: string,
  folderId: string,
): Promise<boolean> {
  if (!folderId || !email) return false;

  const cleanId = folderId.trim();
  const normalizedEmail = email.toLowerCase().trim();
  const cacheKey = `auth:access:${cleanId}:${normalizedEmail}`;

  const cached = memoryCache.get<boolean>(cacheKey);
  if (cached !== null) return cached;

  try {
    const result = await kv.sismember(
      `folder:access:${cleanId}`,
      normalizedEmail,
    );
    if (result === 1) {
      memoryCache.set(cacheKey, true, CACHE_TTL.USER_ACCESS);
      return true;
    }

    // Fallback to durable Postgres ACL if Redis misses (e.g. after flush).
    const row = await db.folderAccess.findUnique({
      where: {
        folderId_email: { folderId: cleanId, email: normalizedEmail },
      },
      select: { id: true },
    });
    const hasAccess = !!row;
    if (hasAccess) {
      // Rehydrate Redis cache for subsequent checks.
      await kv
        .sadd(`folder:access:${cleanId}`, normalizedEmail)
        .catch((err) =>
          logger.warn({ err, cleanId }, "Failed to rehydrate folder ACL cache"),
        );
    }
    memoryCache.set(cacheKey, hasAccess, CACHE_TTL.USER_ACCESS);
    return hasAccess;
  } catch {
    return false;
  }
}

export async function hasUserAccessBatch(
  email: string,
  ids: string[],
): Promise<Record<string, boolean>> {
  if (!email || !ids.length) return {};

  const normalizedEmail = email.toLowerCase().trim();
  const results: Record<string, boolean> = {};
  const idsToCheck: string[] = [];

  for (const id of ids) {
    const cleanId = id.trim();
    const cacheKey = `auth:access:${cleanId}:${normalizedEmail}`;
    const cached = memoryCache.get<boolean>(cacheKey);
    if (cached !== null) {
      results[cleanId] = cached;
    } else {
      results[cleanId] = false;
      idsToCheck.push(cleanId);
    }
  }

  if (idsToCheck.length === 0) return results;

  let pipelineOk = true;
  try {
    const pipeline = kv.pipeline();
    for (const id of idsToCheck) {
      pipeline.sismember(`folder:access:${id}`, normalizedEmail);
    }
    const pipelineResults = await pipeline.exec();
    idsToCheck.forEach((id, index) => {
      results[id] = pipelineResults[index] === 1;
    });
  } catch (e) {
    pipelineOk = false;
    logger.error({ err: e }, "[Auth] Batch access check failed");
  }

  // Fallback to durable Postgres ACL when Redis misses or errors.
  const needDb = pipelineOk
    ? idsToCheck.filter((id) => !results[id])
    : idsToCheck;
  if (needDb.length) {
    try {
      const rows = await db.folderAccess.findMany({
        where: { folderId: { in: needDb }, email: normalizedEmail },
        select: { folderId: true },
      });
      const accessible = new Set(rows.map((r) => r.folderId));
      for (const id of needDb) {
        if (accessible.has(id)) {
          results[id] = true;
          await kv
            .sadd(`folder:access:${id}`, normalizedEmail)
            .catch((err) =>
              logger.warn({ err, id }, "Failed to rehydrate folder ACL cache"),
            );
        }
      }
    } catch (e) {
      logger.error({ err: e }, "[Auth] Batch ACL DB fallback failed");
    }
  }

  for (const id of idsToCheck) {
    memoryCache.set(
      `auth:access:${id}:${normalizedEmail}`,
      results[id],
      CACHE_TTL.USER_ACCESS,
    );
  }

  return results;
}

export async function validateShareToken(
  request: NextRequest,
): Promise<boolean> {
  const { searchParams } = new URL(request.url);
  const shareToken = searchParams.get("share_token");
  if (!shareToken) return false;
  return verifyShareTokenString(shareToken);
}

export async function verifyShareTokenString(token: string): Promise<boolean> {
  if (!token) return false;

  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(token, secret);

    if (typeof payload.jti !== "string") {
      return false;
    }
    const isBlocked = await kv.get(`${REDIS_KEYS.SHARE_BLOCKED}${payload.jti}`);
    if (isBlocked) {
      return false;
    }

    if (payload.loginRequired) {
      const session = await auth();
      return !!session;
    }
    return true;
  } catch {
    return false;
  }
}
