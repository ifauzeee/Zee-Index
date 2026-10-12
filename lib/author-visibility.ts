import { getPublicAppConfig } from "@/lib/app-config";

interface AuthoredItem {
  owners?: unknown;
  lastModifyingUser?: unknown;
}

/**
 * Enforce the admin "hide author" setting on the server. Hiding the author
 * only in the UI still sent owner names to every visitor.
 */
export async function applyAuthorVisibility<T extends AuthoredItem>(
  item: T,
  isAdmin: boolean,
): Promise<T> {
  if (isAdmin) return item;
  const { hideAuthor } = await getPublicAppConfig();
  return hideAuthor
    ? { ...item, owners: undefined, lastModifyingUser: undefined }
    : item;
}
