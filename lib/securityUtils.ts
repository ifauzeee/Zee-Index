import { kv } from "@/lib/kv";
import { getFileDetailsFromDrive } from "@/lib/drive";

const PROTECTED_FOLDERS_KEY = "zee-index:protected-folders";

export async function isAccessRestricted(
  fileId: string,
  allowedTokens: string[] = [],
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

  if (allRestrictedIds.includes(fileId)) {
    if (allowedTokens.includes(fileId)) return false;
    return true;
  }

  try {
    const file = await getFileDetailsFromDrive(fileId);

    if (!file || !file.parents || file.parents.length === 0) return false;

    for (const parentId of file.parents) {
      if (allRestrictedIds.includes(parentId)) {
        if (!allowedTokens.includes(parentId)) return true;
        if (allowedTokens.includes(parentId)) continue;
      }

      if (parentId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID) {
        continue;
      }

      const isParentRestricted = await isAccessRestricted(
        parentId,
        allowedTokens,
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
