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
import { isProviderId } from "@/lib/storage/providers";
import { normalizeLocalStorageId } from "@/lib/storage/local";

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
async function getAllowedRootIds(): Promise<Set<string>> {
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
  if (isLocalStorage) {
    const normalized = normalizeLocalStorageId(fileId);
    if (normalized === null) return true;
    fileId = normalized;
  }

  const isScopedDriveId =
    !isLocalStorage && fileId !== "virtual-root" && !isProviderId(fileId);

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
    if (!(await isWithinAllowedRoots(fileId, allowedRootIds))) {
      return true;
    }
  }

  if (allRestrictedIds.length === 0 && !isLocalRestricted) return false;

  async function checkAccess(id: string) {
    if (accessCache.has(id)) {
      return accessCache.get(id)!;
    }
    if (allowedTokens.includes(id)) return true;
    if (userEmail) {
      const hasAccess = await hasUserAccess(userEmail, id);
      accessCache.set(id, hasAccess);
      if (hasAccess) return true;
    }
    accessCache.set(id, false);
    return false;
  }

  if (allRestrictedIds.includes(fileId)) {
    const access = await checkAccess(fileId);
    if (!access) return true;
  }

  if (isLocalStorage) {
    if (isLocalRestricted) {
      const access = await checkAccess("local-storage:");
      if (!access) return true;
    }
    const parts = fileId.split("/");
    for (let i = parts.length - 1; i >= 1; i--) {
      const parentId = parts.slice(0, i).join("/");
      if (allRestrictedIds.includes(parentId)) {
        const access = await checkAccess(parentId);
        if (!access) return true;
      }
    }
    return false;
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
