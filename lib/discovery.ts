import { db } from "@/lib/db";

export interface DiscoveryFile {
  id: string;
  name: string;
  mimeType: string;
  folderId: string;
  modifiedTime: Date;
}

export interface DiscoveryTopDownload {
  itemId: string;
  itemName: string;
  itemType: string | null;
  folderId: string | null;
  count: number;
}

export async function getRecentlyAdded(limit = 10): Promise<DiscoveryFile[]> {
  return db.fileIndex.findMany({
    orderBy: { modifiedTime: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      mimeType: true,
      folderId: true,
      modifiedTime: true,
    },
  });
}

export async function getTopDownloads(
  limit = 10,
): Promise<DiscoveryTopDownload[]> {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const grouped = await db.activityLog.groupBy({
    by: ["itemId", "itemName", "itemType"],
    where: {
      type: "file:download",
      timestamp: { gte: weekAgo },
      itemId: { not: null },
    },
    _count: { _all: true },
    orderBy: { _count: { itemId: "desc" } },
    take: limit,
  });

  const itemIds = grouped
    .map((g) => g.itemId)
    .filter((id): id is string => !!id);
  const folderByFile =
    itemIds.length > 0
      ? await db.fileIndex.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, folderId: true },
        })
      : [];

  const folderMap = new Map(folderByFile.map((f) => [f.id, f.folderId]));

  return grouped.map((g) => ({
    itemId: g.itemId as string,
    itemName: g.itemName || "Unknown",
    itemType: g.itemType,
    folderId: folderMap.get(g.itemId as string) ?? null,
    count: g._count._all,
  }));
}

/**
 * Resolves which ids are access-restricted by delegating to `isRestricted`
 * (typically `isAccessRestricted`). Ids are deduped first so callers can pass
 * every candidate id without triggering extra Drive lookups.
 */
export async function resolveBlockedIds(
  ids: readonly string[],
  isRestricted: (id: string) => Promise<boolean>,
): Promise<Set<string>> {
  const blocked = new Set<string>();
  await Promise.all(
    Array.from(new Set(ids)).map(async (id) => {
      if (await isRestricted(id)) {
        blocked.add(id);
      }
    }),
  );
  return blocked;
}

/**
 * Keeps only discovery entries the viewer is allowed to see. `blockedItemIds`
 * must be resolved by the caller via `isAccessRestricted`, so files nested in a
 * protected/private folder are excluded too (matching on folder ids alone is
 * shallow and leaks nested content). Guests always get empty sections.
 */
export function filterAccessibleDiscovery(
  recent: DiscoveryFile[],
  top: DiscoveryTopDownload[],
  blockedItemIds: ReadonlySet<string>,
  isGuest: boolean,
): { recent: DiscoveryFile[]; top: DiscoveryTopDownload[] } {
  if (isGuest) {
    return { recent: [], top: [] };
  }

  return {
    recent: recent.filter((file) => !blockedItemIds.has(file.id)),
    top: top.filter(
      (item) => !!item.folderId && !blockedItemIds.has(item.itemId),
    ),
  };
}
