import { kv } from "@/lib/kv";
import { getFileDetailsFromDrive } from "@/lib/googleDrive";

const PROTECTED_FOLDERS_KEY = "zee-index:protected-folders";

export async function isAccessRestricted(
  fileId: string,
  allowedTokens: string[] = [],
): Promise<boolean> {
  const protectedConfigs = (await kv.hgetall(PROTECTED_FOLDERS_KEY)) || {};
  const protectedFolderIds = Object.keys(protectedConfigs);

  if (protectedFolderIds.length === 0) return false;

  if (protectedFolderIds.includes(fileId)) {
    if (allowedTokens.includes(fileId)) return false;
    return true;
  }

  try {
    const file = await getFileDetailsFromDrive(fileId);
    if (!file || !file.parents || file.parents.length === 0) return false;

    const parentId = file.parents[0];

    if (protectedFolderIds.includes(parentId)) {
      if (allowedTokens.includes(parentId)) return false;
      return true;
    }

    if (parentId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID) return false;

    return await isAccessRestricted(parentId, allowedTokens);
  } catch (error) {
    console.error("Security Check Error:", error);
    return true;
  }
}
