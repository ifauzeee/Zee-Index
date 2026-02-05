import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";
import { memoryCache, CACHE_TTL } from "@/lib/memory-cache";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getPrivateFolderIds } from "@/lib/utils";

export function isPrivateFolder(folderId: string): boolean {
  if (!folderId) return false;
  return getPrivateFolderIds().includes(folderId.trim());
}

export async function isProtected(folderId: string): Promise<boolean> {
  if (!folderId) return false;

  const targetId = folderId.trim();
  const cacheKey = `auth:protected:${targetId}`;

  const cached = memoryCache.get<boolean>(cacheKey);
  if (cached !== null) return cached;

  try {
    const protectedFolders = await kv.hgetall("zee-index:protected-folders");

    if (!protectedFolders) {
      memoryCache.set(cacheKey, false, CACHE_TTL.PROTECTED_FOLDERS);
      return false;
    }

    const folders = protectedFolders as Record<string, unknown>;
    const result = !!(
      folders[targetId] ||
      Object.keys(folders).some((key) => key.trim() === targetId)
    );

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
    const protectedFolders = await kv.hgetall<
      Record<string, { id: string; password: string }>
    >("zee-index:protected-folders");

    if (!protectedFolders) return null;

    const foundKey = Object.keys(protectedFolders).find(
      (key) => key.trim() === targetId,
    );

    if (foundKey) {
      return protectedFolders[foundKey];
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
  const cacheKey = `auth:access:${cleanId}:${email}`;

  const cached = memoryCache.get<boolean>(cacheKey);
  if (cached !== null) return cached;

  try {
    const result = await kv.sismember(`folder:access:${cleanId}`, email);
    const hasAccess = result === 1;
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

  const results: Record<string, boolean> = {};
  const idsToCheck: string[] = [];

  for (const id of ids) {
    const cleanId = id.trim();
    const cacheKey = `auth:access:${cleanId}:${email}`;
    const cached = memoryCache.get<boolean>(cacheKey);
    if (cached !== null) {
      results[cleanId] = cached;
    } else {
      idsToCheck.push(cleanId);
    }
  }

  if (idsToCheck.length === 0) return results;

  try {
    const pipeline = kv.pipeline();
    for (const id of idsToCheck) {
      pipeline.sismember(`folder:access:${id}`, email);
    }
    const pipelineResults = await pipeline.exec();

    idsToCheck.forEach((id, index) => {
      const hasAccess = pipelineResults[index] === 1;
      results[id] = hasAccess;
      memoryCache.set(
        `auth:access:${id}:${email}`,
        hasAccess,
        CACHE_TTL.USER_ACCESS,
      );
    });
  } catch (e) {
    console.error("[Auth] Batch access check failed:", e);
    idsToCheck.forEach((id) => {
      if (!(id in results)) results[id] = false;
    });
  }

  return results;
}

export async function validateShareToken(
  request: NextRequest,
): Promise<boolean> {
  const { searchParams } = new URL(request.url);
  const shareToken = searchParams.get("share_token");
  if (!shareToken) return false;

  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);

    if (typeof payload.jti !== "string") {
      return false;
    }
    const isBlocked = await kv.get(`zee-index:blocked:${payload.jti}`);
    if (isBlocked) {
      return false;
    }

    if (payload.loginRequired) {
      const session = await getServerSession(authOptions);
      return !!session;
    }
    return true;
  } catch {
    return false;
  }
}

export async function verifyShareTokenString(token: string): Promise<boolean> {
  if (!token) return false;

  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(token, secret);

    if (typeof payload.jti !== "string") {
      return false;
    }
    const isBlocked = await kv.get(`zee-index:blocked:${payload.jti}`);
    if (isBlocked) {
      return false;
    }

    if (payload.loginRequired) {
      const session = await getServerSession(authOptions);
      return !!session;
    }
    return true;
  } catch {
    return false;
  }
}
