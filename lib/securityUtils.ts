import { db } from "@/lib/db";
import { getFileDetailsFromDrive } from "@/lib/drive";
import { hasUserAccess } from "@/lib/auth";
import { getPrivateFolderIds } from "@/lib/utils";
import { logger } from "@/lib/logger";

let cachedProtectedIds: string[] | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 10000;

/** @internal */
export function __resetCache() {
  cachedProtectedIds = null;
  lastCacheUpdate = 0;
}

async function getRestrictedIds(): Promise<string[]> {
  const now = Date.now();
  if (cachedProtectedIds && now - lastCacheUpdate < CACHE_TTL) {
    return cachedProtectedIds;
  }

  try {
    const protecteds = await db.protectedFolder.findMany({
      select: { folderId: true },
    });
    const kvProtectedIds = protecteds.map(
      (p: { folderId: string }) => p.folderId,
    );
    const envPrivateIds = getPrivateFolderIds();

    cachedProtectedIds = Array.from(
      new Set([...kvProtectedIds, ...envPrivateIds]),
    );
    lastCacheUpdate = now;
    return cachedProtectedIds;
  } catch (e) {
    logger.error({ err: e }, "Failed to fetch restricted IDs");
    return cachedProtectedIds || [];
  }
}

export async function isAccessRestricted(
  fileId: string,
  allowedTokens: string[] = [],
  userEmail: string | null | undefined = null,
  depth: number = 0,
  maxDepth: number = 20,
  preFetchedRestrictedIds: string[] | null = null,
): Promise<boolean> {
  if (depth >= maxDepth) {
    logger.error({ fileId, depth }, "Max depth reached for security check");
    return true;
  }

  const allRestrictedIds =
    preFetchedRestrictedIds || (await getRestrictedIds());

  if (allRestrictedIds.length === 0) return false;

  async function checkAccess(id: string) {
    if (allowedTokens.includes(id)) return true;
    if (userEmail) {
      const hasAccess = await hasUserAccess(userEmail, id);
      if (hasAccess) return true;
    }
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
      );
      if (isParentRestricted) return true;
    }

    return false;
  } catch (error) {
    logger.error({ err: error, fileId }, "Error checking access restriction");
    return true;
  }
}
