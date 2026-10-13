import type { ZeeFile } from "@/types/storage";

/**
 * Folders a file lives in. Drive and S3 files carry `parents`; local-storage,
 * WebDAV and Dropbox files only carry a path-style id (`<prefix>dir/name`),
 * so their folder is the id up to the last slash, or the provider root.
 */
export function getContainingFolderIds(
  file: Pick<ZeeFile, "id" | "parents">,
): string[] {
  if (file.parents?.length) return file.parents;
  const prefixEnd = file.id.indexOf(":") + 1;
  if (prefixEnd === 0) return [];
  const slash = file.id.lastIndexOf("/");
  return [
    slash >= prefixEnd ? file.id.slice(0, slash) : file.id.slice(0, prefixEnd),
  ];
}

/** The folder to open a file under, or undefined when it cannot be told. */
export function getParentFolderId(
  file: Pick<ZeeFile, "id" | "parents">,
): string | undefined {
  return getContainingFolderIds(file)[0];
}

function createSlug(name: string): string {
  return encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());
}

/**
 * App URL that opens a file or folder, with ids encoded so path-style ids
 * (`local-storage:dir/a.txt`) stay one route segment. Null when a file's
 * folder cannot be told.
 */
export function getItemHref(
  file: Pick<ZeeFile, "id" | "parents" | "name" | "isFolder">,
): string | null {
  if (file.isFolder) return `/folder/${encodeURIComponent(file.id)}`;
  const parent = getParentFolderId(file);
  if (!parent) return null;
  return `/folder/${encodeURIComponent(parent)}/file/${encodeURIComponent(
    file.id,
  )}/${createSlug(file.name)}`;
}
