import FileBrowser from "@/components/file-browser/FileBrowser";
import { getFolderPath } from "@/lib/drive";
import { listAllFiles } from "@/lib/storage";
import { getActiveProvider, isProviderId } from "@/lib/storage/providers";
import { ZeeFile } from "@/types/storage";
import { isPrivateFolder } from "@/lib/auth";
import { getAllowedRootIds, isAccessRestricted } from "@/lib/securityUtils";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { logger } from "@/lib/logger";

export const revalidate = 3600;

async function getUnifiedPath(folderId: string, locale: string) {
  if (folderId.startsWith("local-storage:")) {
    const localPath = folderId.replace("local-storage:", "");
    const segments = localPath.split("/").filter(Boolean);
    const pathNodes = [
      {
        id: "local-storage:",
        name: locale === "id" ? "Penyimpanan Lokal" : "Local Storage",
      },
    ];

    let currentPath = "";
    segments.forEach((segment) => {
      currentPath += segment + "/";
      pathNodes.push({ id: `local-storage:${currentPath}`, name: segment });
    });

    return pathNodes;
  }

  if (isProviderId(folderId)) {
    const provider = getActiveProvider();
    if (provider) {
      const relPath = folderId.slice(provider.idPrefix.length);
      const segments = relPath.split("/").filter(Boolean);
      const pathNodes = [
        {
          id: provider.rootId,
          name: provider.rootName,
        },
      ];

      let currentPath = "";
      segments.forEach((segment) => {
        currentPath += segment + "/";
        pathNodes.push({
          id: `${provider.idPrefix}${currentPath}`,
          name: segment,
        });
      });

      return pathNodes;
    }
  }

  return getFolderPath(folderId, locale);
}

export async function generateMetadata(props: {
  params: Promise<{ folderId: string; locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const folderId = decodeURIComponent(params.folderId);
  // Metadata is public and cached, so only name folders an anonymous
  // visitor could open (Z2-11).
  const restricted = await isAccessRestricted(folderId);
  const path = restricted ? [] : await getUnifiedPath(folderId, params.locale);
  const folderName = path[path.length - 1]?.name || "Folder";
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Zee Index";

  const description =
    params.locale === "id"
      ? `Lihat isi folder ${folderName} di ${appName}. Streaming cepat dan navigasi instan.`
      : `Explore ${folderName} on ${appName}. High-speed streaming and instant navigation.`;

  return {
    title: `${folderName} - ${appName}`,
    description,
    openGraph: {
      title: `${folderName} - ${appName}`,
      description,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(folderName)}&id=${folderId}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${folderName} - ${appName}`,
      description,
      images: [
        `/api/og?title=${encodeURIComponent(folderName)}&id=${folderId}`,
      ],
    },
  };
}

export default async function FolderPage(props: {
  params: Promise<{ folderId: string; locale: string }>;
}) {
  const params = await props.params;
  const { folderId, locale } = params;
  const cleanFolderId = decodeURIComponent(folderId)
    .split("&")[0]
    .split("?")[0]
    .trim();

  // This page is ISR-cached and shared by every visitor, so it renders what
  // an anonymous visitor may see; unlocked content is fetched client-side
  // through /api/files with the visitor's own tokens.
  const isPathStyleId =
    cleanFolderId.startsWith("local-storage:") || isProviderId(cleanFolderId);
  const [rawPath, restricted] = await Promise.all([
    getUnifiedPath(cleanFolderId, locale),
    isAccessRestricted(cleanFolderId),
  ]);

  if (!isPathStyleId) {
    const allowedRoots = await getAllowedRootIds();
    if (rawPath.length === 0 || !allowedRoots.has(rawPath[0].id)) {
      notFound();
    }
  }

  // Protection is inherited, so an unrestricted folder has no locked
  // ancestors. For a restricted one, let the client load the breadcrumbs
  // from /api/folderpath, which names only the folders this visitor unlocked.
  const folderPath = restricted ? undefined : rawPath;

  let initialFiles: ZeeFile[] | undefined;
  let initialNextPageToken: string | null = null;

  if (!restricted) {
    try {
      const [data, allProtectedFolders] = await Promise.all([
        listAllFiles({
          folderId: cleanFolderId,
          pageToken: null,
          pageSize: 50,
          useCache: true,
        }),
        import("@/lib/db").then((m) =>
          m.db.protectedFolder.findMany({ select: { folderId: true } }),
        ),
      ]);
      const protectedIds = new Set(
        allProtectedFolders.map(
          (entry: { folderId: string }) => entry.folderId,
        ),
      );
      initialFiles = data.files
        // Same rule as /api/files for anonymous visitors: private folders are
        // hidden unless they are also password protected, and both are
        // listed with a lock.
        .filter((f) => !isPrivateFolder(f.id) || protectedIds.has(f.id))
        .map((f) => ({
          ...f,
          isProtected: protectedIds.has(f.id) || isPrivateFolder(f.id),
        }));
      initialNextPageToken = data.nextPageToken;
    } catch (e) {
      logger.error({ err: e }, "ISR Fetch error");
      initialFiles = [];
    }
  }

  return (
    <FileBrowser
      initialFolderId={cleanFolderId}
      initialFolderPath={folderPath}
      initialFiles={initialFiles}
      initialNextPageToken={initialNextPageToken}
    />
  );
}
