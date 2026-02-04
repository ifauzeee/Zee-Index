import { kv } from "@/lib/kv";
import { getFileDetailsFromDrive } from "@/lib/drive";
import { hasUserAccess } from "@/lib/auth";

const PROTECTED_FOLDERS_KEY = "zee-index:protected-folders";

let cachedProtectedIds: string[] | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 10000;

async function getRestrictedIds(): Promise<string[]> {
  const now = Date.now();
  if (cachedProtectedIds && now - lastCacheUpdate < CACHE_TTL) {
    return cachedProtectedIds;
  }

  try {
    const protectedConfigs = (await kv.hgetall(PROTECTED_FOLDERS_KEY)) || {};
    const kvProtectedIds = Object.keys(protectedConfigs);
    const envPrivateIds = (process.env.PRIVATE_FOLDER_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);

    cachedProtectedIds = Array.from(
      new Set([...kvProtectedIds, ...envPrivateIds]),
    );
    lastCacheUpdate = now;
    return cachedProtectedIds;
  } catch (e) {
    console.error("Failed to fetch restricted IDs:", e);
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
    console.error(`Max depth reached for fileId: ${fileId}`);
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
    console.error("Error checking access restriction:", error);
    return true;
  }
}
