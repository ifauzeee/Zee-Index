import FileBrowser from "@/components/file-browser/FileBrowser";
import { getFolderPath } from "@/lib/drive";
import { listAllFiles } from "@/lib/storage";
import { ZeeFile } from "@/types/storage";
import { isProtected } from "@/lib/auth";
import { Metadata } from "next";
import { logger } from "@/lib/logger";

export const revalidate = 3600;

type ProtectedFolderMap = Record<string, boolean>;

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
  return getFolderPath(folderId, locale);
}

export async function generateMetadata(props: {
  params: Promise<{ folderId: string; locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const folderId = decodeURIComponent(params.folderId);
  const path = await getUnifiedPath(folderId, params.locale);
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

  const [folderPath, protectedStatus, allProtectedFolders, isPrivateFolder] =
    await Promise.all([
      getUnifiedPath(cleanFolderId, locale),
      cleanFolderId.startsWith("local-storage:")
        ? false
        : isProtected(cleanFolderId),
      import("@/lib/db").then((m) =>
        m.db.protectedFolder
          .findMany({ select: { folderId: true } })
          .then((res: { folderId: string }[]) => {
            const map: ProtectedFolderMap = {};
            res.forEach((entry) => {
              map[entry.folderId] = true;
            });
            return map;
          }),
      ),
      import("@/lib/auth").then((m) => m.isPrivateFolder),
    ]);

  let initialFiles: ZeeFile[] | undefined;
  let initialNextPageToken: string | null = null;

  const isLocked =
    !cleanFolderId.startsWith("local-storage:") &&
    (protectedStatus || isPrivateFolder(cleanFolderId));

  if (!isLocked) {
    try {
      const data = await listAllFiles({
        folderId: cleanFolderId,
        pageToken: null,
        pageSize: 50,
        useCache: true,
      });
      initialFiles = data.files.map((f) => {
        const isProt = !!allProtectedFolders[f.id];
        const isPriv = isPrivateFolder(f.id);
        return {
          ...f,
          isProtected: isProt || isPriv,
        };
      });
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
