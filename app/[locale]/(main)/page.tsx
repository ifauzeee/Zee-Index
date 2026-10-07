import FileBrowser from "@/components/file-browser/FileBrowser";
import DiscoverySections from "@/components/discovery/DiscoverySections";
import ContinueWatching from "@/components/discovery/ContinueWatching";
import { listAllFiles } from "@/lib/storage";
import { ZeeFile } from "@/types/storage";
import { getRootFolderId } from "@/lib/config";
import {
  DISCOVERY_LIMIT,
  DISCOVERY_SCAN_LIMIT,
  filterAccessibleDiscovery,
  getRecentlyAdded,
  getTopDownloads,
  resolveBlockedIds,
} from "@/lib/discovery";
import { logger } from "@/lib/logger";
import { getActiveProvider } from "@/lib/storage/providers";
import { auth } from "@/auth";
import {
  getProtectedFolderIdsCached,
  isAccessRestricted,
} from "@/lib/securityUtils";

export const dynamic = "force-dynamic";

type ProtectedFolderMap = Record<string, boolean>;

export default async function Home() {
  const rootId = (await getRootFolderId()) || "virtual-root";
  const [recent, top, session] = await Promise.all([
    getRecentlyAdded(DISCOVERY_SCAN_LIMIT).catch(() => []),
    getTopDownloads(DISCOVERY_SCAN_LIMIT).catch(() => []),
    auth(),
  ]);
  const isGuest =
    session?.user?.isGuest === true || session?.user?.role === "GUEST";

  const [isProtected, isPrivateFolder] = await Promise.all([
    import("@/lib/auth").then((m) => m.isProtected),
    import("@/lib/auth").then((m) => m.isPrivateFolder),
  ]);

  const protectedFolderIds = await getProtectedFolderIdsCached();
  const protectedFolderMap: ProtectedFolderMap = {};
  protectedFolderIds.forEach((id) => {
    protectedFolderMap[id] = true;
  });

  const isAdmin = session?.user?.role === "ADMIN";
  const accessCache = new Map<string, boolean>();
  const blockedItemIds =
    isGuest || isAdmin
      ? new Set<string>()
      : await resolveBlockedIds(
          [...recent.map((file) => file.id), ...top.map((item) => item.itemId)],
          (id) =>
            isAccessRestricted(
              id,
              [],
              session?.user?.email,
              0,
              20,
              null,
              new Set(),
              accessCache,
            ),
        );

  const discovery = filterAccessibleDiscovery(
    recent,
    top,
    blockedItemIds,
    isGuest,
    DISCOVERY_LIMIT,
  );

  const provider = getActiveProvider();
  const hasLocalStorage =
    process.env.NEXT_PUBLIC_ENABLE_LOCAL_STORAGE === "true" &&
    !!process.env.LOCAL_STORAGE_PATH;
  const showVirtualRoot =
    rootId === "virtual-root" || !!provider || hasLocalStorage;
  const initialFolderId = showVirtualRoot ? "virtual-root" : rootId;

  let initialFiles: ZeeFile[] | undefined;
  let initialNextPageToken: string | null = null;

  const isLocked =
    initialFolderId !== "virtual-root" &&
    ((await isProtected(initialFolderId)) || isPrivateFolder(initialFolderId));

  if (!isLocked) {
    try {
      const data = await listAllFiles({
        folderId: initialFolderId,
        pageToken: null,
        pageSize: 50,
        useCache: true,
      });

      initialFiles = data.files.map((f) => {
        const isProt = !!protectedFolderMap[f.id];
        const isPriv = isPrivateFolder(f.id);
        return {
          ...f,
          isProtected: isProt || isPriv,
        };
      });
      initialNextPageToken = data.nextPageToken;
    } catch (e) {
      logger.error({ err: e }, "ISR Root fetch error");
      initialFiles = [];
    }
  }

  return (
    <>
      <ContinueWatching />
      <DiscoverySections recent={discovery.recent} top={discovery.top} />
      <FileBrowser
        initialFolderId={initialFolderId}
        initialFiles={initialFiles}
        initialNextPageToken={initialNextPageToken}
      />
    </>
  );
}
