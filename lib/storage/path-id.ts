import path from "path";

/**
 * Canonical form of a path-style storage id (`local-storage:a/b`,
 * `webdav:a/b`, `s3:a/b/`): `..` and `.` resolved, backslashes treated as
 * separators, no leading or trailing slash. Returns null when the path
 * escapes the storage root or contains a NUL byte, so `prefix:public/../x`
 * can never be compared (or sent to a backend) in its raw form.
 */
export function normalizePathId(id: string, prefix: string): string | null {
  if (!id.startsWith(prefix) || id.includes("\0")) return null;

  const raw = id.slice(prefix.length).replace(/\\/g, "/");
  let normalized = path.posix.normalize(raw || ".");
  normalized = normalized.replace(/^\/+|\/+$/g, "");
  if (normalized === ".") normalized = "";
  if (normalized === ".." || normalized.startsWith("../")) return null;

  return `${prefix}${normalized}`;
}
