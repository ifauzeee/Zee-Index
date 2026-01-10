import { kv } from "@/lib/kv";
import { getFileDetailsFromDrive } from "@/lib/drive";
import { hasUserAccess } from "@/lib/auth";

const PROTECTED_FOLDERS_KEY = "zee-index:protected-folders";

export async function isAccessRestricted(
  fileId: string,
  allowedTokens: string[] = [],
  userEmail: string | null | undefined = null,
  depth: number = 0,
  maxDepth: number = 20,
): Promise<boolean> {
  if (depth >= maxDepth) {
    console.error(`Max depth reached for fileId: ${fileId}`);
    return true;
  }

  const protectedConfigs = (await kv.hgetall(PROTECTED_FOLDERS_KEY)) || {};
  const kvProtectedIds = Object.keys(protectedConfigs);

  const envPrivateIds = (process.env.PRIVATE_FOLDER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id);

  const allRestrictedIds = Array.from(
    new Set([...kvProtectedIds, ...envPrivateIds]),
  );

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
        if (access) continue;
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
      );
      if (isParentRestricted) return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking access restriction:", error);
    return true;
  }
}
