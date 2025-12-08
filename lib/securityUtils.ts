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

    for (const parentId of file.parents) {
      if (protectedFolderIds.includes(parentId)) {
        if (!allowedTokens.includes(parentId)) return true;
      }

      if (parentId !== process.env.NEXT_PUBLIC_ROOT_FOLDER_ID) {
        const isParentRestricted = await isAccessRestricted(
          parentId,
          allowedTokens,
        );
        if (isParentRestricted) return true;
      }
    }

    return false;
  } catch (error) {
    console.error(error);
    return true;
  }
}
