import { db } from "@/lib/db";
import { getFileDetailsFromDrive } from "@/lib/drive";
import { hasUserAccess } from "@/lib/auth";
import { getPrivateFolderIds } from "@/lib/utils";
import { logger } from "@/lib/logger";

let cachedProtectedIds: string[] | null = null;
let cachedRestrictedIds: string[] | null = null;
let lastProtectedUpdate = 0;
let lastRestrictedUpdate = 0;
const CACHE_TTL = 10000;

export function __resetCache() {
  cachedProtectedIds = null;
  cachedRestrictedIds = null;
  lastProtectedUpdate = 0;
  lastRestrictedUpdate = 0;
}

export async function getProtectedFolderIdsCached(): Promise<string[]> {
  const now = Date.now();
  if (cachedProtectedIds && now - lastProtectedUpdate < CACHE_TTL) {
    return cachedProtectedIds;
  }

  try {
    const protecteds = await db.protectedFolder.findMany({
      select: { folderId: true },
    });
    const dbProtectedIds = protecteds.map(
      (p: { folderId: string }) => p.folderId,
    );
    cachedProtectedIds = Array.from(new Set(dbProtectedIds));
    lastProtectedUpdate = now;
    return cachedProtectedIds;
  } catch (e) {
    logger.error({ err: e }, "Failed to fetch restricted IDs");
    return cachedProtectedIds || [];
  }
}

async function getRestrictedIds(): Promise<string[]> {
  const now = Date.now();
  if (cachedRestrictedIds && now - lastRestrictedUpdate < CACHE_TTL) {
    return cachedRestrictedIds;
  }

  try {
    const protectedIds = await getProtectedFolderIdsCached();
    const envPrivateIds = getPrivateFolderIds();

    cachedRestrictedIds = Array.from(
      new Set([...protectedIds, ...envPrivateIds]),
    );
    lastRestrictedUpdate = now;
    return cachedRestrictedIds;
  } catch (e) {
    logger.error({ err: e }, "Failed to fetch restricted IDs");
    return cachedRestrictedIds || [];
  }
}

export async function isAccessRestricted(
  fileId: string,
  allowedTokens: string[] = [],
  userEmail: string | null | undefined = null,
  depth: number = 0,
  maxDepth: number = 20,
  preFetchedRestrictedIds: string[] | null = null,
  visited: Set<string> = new Set(),
  accessCache: Map<string, boolean> = new Map(),
): Promise<boolean> {
  if (depth >= maxDepth) {
    logger.error({ fileId, depth }, "Max depth reached for security check");
    return true;
  }

  if (visited.has(fileId)) {
    return false;
  }
  visited.add(fileId);

  const allRestrictedIds =
    preFetchedRestrictedIds || (await getRestrictedIds());

  if (allRestrictedIds.length === 0) return false;

  async function checkAccess(id: string) {
    if (accessCache.has(id)) {
      return accessCache.get(id)!;
    }
    if (allowedTokens.includes(id)) return true;
    if (userEmail) {
      const hasAccess = await hasUserAccess(userEmail, id);
      accessCache.set(id, hasAccess);
      if (hasAccess) return true;
    }
    accessCache.set(id, false);
    return false;
  }

  if (allRestrictedIds.includes(fileId)) {
    const access = await checkAccess(fileId);
    if (!access) return true;
  }

  try {
    const file = await getFileDetailsFromDrive(fileId);
    if (!file || !file.parents || file.parents.length === 0) return false;

    for (const parentId of file.parents) {
      if (allRestrictedIds.includes(parentId)) {
        const access = await checkAccess(parentId);
        if (!access) return true;
      }

      if (parentId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID) {
        continue;
      }

      const isParentRestricted = await isAccessRestricted(
        parentId,
        allowedTokens,
        userEmail,
        depth + 1,
        maxDepth,
        allRestrictedIds,
        visited,
        accessCache,
      );
      if (isParentRestricted) return true;
    }

    return false;
  } catch (error) {
    logger.error({ err: error, fileId }, "Error checking access restriction");
    return true;
  }
}
