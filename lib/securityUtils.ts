import { db } from "@/lib/db";
import { getFileDetailsFromDrive } from "@/lib/drive";
import { GOOGLE_DRIVE_API_BASE_URL } from "@/lib/constants";
import { hasUserAccess } from "@/lib/auth";
import { getPrivateFolderIds } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { memoryCache } from "@/lib/memory-cache";
import { getRootFolderId } from "@/lib/config";
import { kv } from "@/lib/kv";
import {
  MANUAL_DRIVES_KEY,
  parseManualDriveRecords,
  parseManualDrivesFromEnv,
} from "@/lib/manual-drives";
import { getActiveProvider } from "@/lib/storage/providers";
import { normalizePathId } from "@/lib/storage/path-id";
import { isShareGrantFor, sharedItemIds } from "@/lib/share-grant";

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

const ALLOWED_ROOTS_CACHE_KEY_PREFIX = "scope:inroot:";
const ALLOWED_ROOTS_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_PARENT_DEPTH = 20;
const ROOT_ALIAS_CACHE_KEY = "drive:alias:";
const ROOT_ALIAS_TTL_S = 3600;

/**
 * Resolve the `root` alias documented in .env.example to the Drive's real
 * root folder id. Drive parent ids are real ids, so an alias left unresolved
 * would never match a parent chain and hide everything from non-admins. The
 * mapping is cached in KV with the same lifetime as folder-content caches.
 */
async function resolveRootAlias(rootId: string): Promise<string> {
  if (rootId !== "root") return rootId;
  const cacheKey = `${ROOT_ALIAS_CACHE_KEY}root`;
  try {
    const cached = await kv.get<string>(cacheKey);
    if (cached) return cached;
  } catch (e) {
    logger.warn({ err: e }, "Failed to read root alias cache");
  }

  const { getAccessToken } = await import("@/lib/drive");
  const accessToken = await getAccessToken();
  const response = await fetch(
    `${GOOGLE_DRIVE_API_BASE_URL}/files/root?fields=id&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );
  if (!response.ok) return rootId;
  const data = (await response.json()) as { id?: string };
  if (!data.id) return rootId;

  try {
    await kv.set(cacheKey, data.id, { ex: ROOT_ALIAS_TTL_S });
  } catch (e) {
    logger.warn({ err: e }, "Failed to cache root alias");
  }
  return data.id;
}

/**
 * Every folder a non-admin visitor may reach: the configured root (with the
 * `root` alias resolved to the real id), plus every manual/shared drive the
 * deployment has registered. Anything outside this set is hidden from users
 * who are not granted access explicitly.
 */
export async function getAllowedRootIds(): Promise<Set<string>> {
  const roots = new Set<string>();

  const rootFolderId = await getRootFolderId();
  if (rootFolderId) roots.add(await resolveRootAlias(rootFolderId));

  for (const drive of parseManualDrivesFromEnv(
    process.env.NEXT_PUBLIC_MANUAL_DRIVES,
  )) {
    roots.add(drive.id);
  }

  for (const drive of parseManualDriveRecords(
    await kv.get(MANUAL_DRIVES_KEY),
  )) {
    roots.add(drive.id);
  }

  return roots;
}

/**
 * True when `fileId` sits inside (or is) one of the allowed roots. The ancestor
 * chain is walked through Drive metadata because a folder's id alone says
 * nothing about where it lives. Receives the caller's already-resolved root
 * set so recursive checks do not re-read config and KV at every level.
 */
async function isWithinAllowedRoots(
  fileId: string,
  roots: Set<string>,
): Promise<boolean> {
  const cached = memoryCache.get<boolean>(
    `${ALLOWED_ROOTS_CACHE_KEY_PREFIX}${fileId}`,
  );
  if (cached !== null) return cached;

  const computeScoped = async (): Promise<boolean> => {
    let currentId: string | undefined = fileId;

    for (let level = 0; level < MAX_PARENT_DEPTH; level++) {
      if (!currentId) return false;
      if (roots.has(currentId)) return true;

      let file: Awaited<ReturnType<typeof getFileDetailsFromDrive>>;
      try {
        file = await getFileDetailsFromDrive(currentId);
      } catch (e) {
        // A transient Drive error must not be remembered as "outside the
        // root": that would hide public folders until the cache expires.
        logger.warn({ err: e, fileId }, "Drive lookup failed during scoping");
        throw e;
      }
      const parents = file?.parents;
      if (!file || !parents || parents.length === 0) return false;

      currentId = parents[0];
    }

    return false;
  };

  let allowed: boolean;
  try {
    allowed = await computeScoped();
  } catch {
    // Fail closed for this request, but leave the result uncached so the
    // next request retries the Drive lookup.
    return true;
  }
  // Cache positive outcomes only; a "no" can be caused by a transient Drive
  // failure and must not pin the file as restricted for the full TTL.
  if (allowed) {
    memoryCache.set(
      `${ALLOWED_ROOTS_CACHE_KEY_PREFIX}${fileId}`,
      allowed,
      ALLOWED_ROOTS_CACHE_TTL_MS,
    );
  }
  return allowed;
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

/**
 * Fail-closed check: true unless the file is provably reachable. The parent
 * walk caps at 20 levels -- the same limit as the root-scoping walk -- so files
 * legitimately nested deep under the root are not hidden by the depth cap.
 */
export async function isAccessRestricted(
  fileId: string,
  allowedTokens: string[] = [],
  userEmail: string | null | undefined = null,
  depth: number = 0,
  maxDepth: number = 20,
  preFetchedRestrictedIds: string[] | null = null,
  visited: Set<string> = new Set(),
  accessCache: Map<string, boolean> = new Map(),
  resolvedRoots?: Set<string>,
): Promise<boolean> {
  const isLocalStorage = fileId.startsWith("local-storage:");
  const provider = getActiveProvider();
  // Local storage and external providers address files by path; Drive ids
  // are opaque and need the parent walk below.
  const pathPrefix = isLocalStorage
    ? "local-storage:"
    : provider && fileId.startsWith(provider.idPrefix)
      ? provider.idPrefix
      : null;
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

  const { getAppConfig } = await import("@/lib/app-config");
  const config = await getAppConfig();
  const isLocalRestricted =
    config.localStorageAuthEnabled ||
    allRestrictedIds.includes("local-storage:");

  // Normalize before any comparison: a `..` alias can name a protected
  // folder or a sibling subtree without its raw form containing the id.
  if (pathPrefix) {
    const normalized = normalizePathId(fileId, pathPrefix);
    if (normalized === null) return true;
    fileId = normalized;
  }

  const isScopedDriveId = !pathPrefix && fileId !== "virtual-root";

  // Resolve the allowed roots once per top-level check and pass them down
  // the recursion instead of re-reading config and KV at every level. Only
  // Drive-scoped ids need them; a Drive failure here fails closed for that
  // request instead of turning a local-file request into a route error.
  let allowedRootIds: Set<string> | undefined;
  if (isScopedDriveId) {
    try {
      allowedRootIds = resolvedRoots ?? (await getAllowedRootIds());
    } catch (e) {
      logger.warn(
        { err: e, fileId },
        "Failed to resolve allowed roots during scoping",
      );
      return true;
    }
    // Only the top-level id needs the scope walk: every parent the recursion
    // visits lies on that same, already-checked path to an allowed root.
    if (depth === 0 && !(await isWithinAllowedRoots(fileId, allowedRootIds))) {
      return true;
    }

    // A share link opens the shared item and, through the parent walk
    // below, everything inside a shared folder.
    if (isShareGrantFor(allowedTokens, fileId)) return false;
  }

  if (allRestrictedIds.length === 0 && !isLocalRestricted) return false;

  async function checkAccess(id: string) {
    if (accessCache.has(id)) {
      return accessCache.get(id)!;
    }
    if (allowedTokens.includes(id) || isShareGrantFor(allowedTokens, id)) {
      return true;
    }
    if (userEmail) {
      const hasAccess = await hasUserAccess(userEmail, id);
      accessCache.set(id, hasAccess);
      if (hasAccess) return true;
    }
    accessCache.set(id, false);
    return false;
  }

  if (pathPrefix) {
    const rel = fileId.slice(pathPrefix.length);
    const segments = rel ? rel.split("/") : [];

    // A share link opens the shared item and everything below it.
    const grantedPaths = new Set(
      sharedItemIds(allowedTokens)
        .map((id) => normalizePathId(id, pathPrefix))
        .filter((id): id is string => id !== null),
    );
    for (let i = 0; i <= segments.length; i++) {
      if (grantedPaths.has(pathPrefix + segments.slice(0, i).join("/"))) {
        return false;
      }
    }

    if (isLocalStorage && isLocalRestricted) {
      const access = await checkAccess("local-storage:");
      if (!access) return true;
    }

    // Protected ids are compared in canonical form too (S3 folder ids end
    // in "/"), but access is checked against the id as stored, which is
    // what folder tokens and ACL entries carry.
    const restrictedByPath = new Map<string, string>();
    for (const id of allRestrictedIds) {
      const normalized = id.startsWith(pathPrefix)
        ? normalizePathId(id, pathPrefix)
        : null;
      if (normalized !== null) restrictedByPath.set(normalized, id);
    }

    // The storage root, every ancestor folder, and the item itself.
    for (let i = 0; i <= segments.length; i++) {
      const candidate = pathPrefix + segments.slice(0, i).join("/");
      const storedId = restrictedByPath.get(candidate);
      if (storedId !== undefined && !(await checkAccess(storedId))) {
        return true;
      }
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

      if (allowedRootIds?.has(parentId)) {
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
        allowedRootIds,
      );
      if (isParentRestricted) return true;
    }

    return false;
  } catch (error) {
    logger.error({ err: error, fileId }, "Error checking access restriction");
    return true;
  }
}

/**
 * Replace the names of folders the requester cannot open with `placeholder`.
 * `path` runs root → leaf, and protection is inherited, so once one folder is
 * locked every folder below it stays locked. Ids are kept: the client needs
 * them to match the folder tokens it already holds.
 */
export async function redactRestrictedPath<
  T extends { id: string; name: string },
>(
  path: T[],
  allowedTokens: string[],
  userEmail: string | null | undefined,
  placeholder: string,
): Promise<T[]> {
  const restrictedIds = new Set(await getRestrictedIds());
  let locked = false;
  let shared = false;
  const result: T[] = [];

  for (const node of path) {
    // A share link opens the shared folder and everything below it.
    if (isShareGrantFor(allowedTokens, node.id)) {
      shared = true;
      locked = false;
    }
    if (
      !shared &&
      !locked &&
      restrictedIds.has(node.id) &&
      !allowedTokens.includes(node.id) &&
      !(userEmail && (await hasUserAccess(userEmail, node.id)))
    ) {
      locked = true;
    }
    result.push(locked ? { ...node, name: placeholder } : node);
  }

  return result;
}
