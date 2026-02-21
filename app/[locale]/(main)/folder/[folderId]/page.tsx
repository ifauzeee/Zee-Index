import FileBrowser from "@/components/file-browser/FileBrowser";
import { getFolderPath, listFilesFromDrive } from "@/lib/drive";
import { isProtected } from "@/lib/auth";
import { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata(props: {
  params: Promise<{ folderId: string; locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const folderId = decodeURIComponent(params.folderId);
  const path = await getFolderPath(folderId, params.locale);
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
      getFolderPath(cleanFolderId, locale),
      isProtected(cleanFolderId),
      import("@/lib/db").then((m) =>
        m.db.protectedFolder
          .findMany({ select: { folderId: true } })
          .then((res) => {
            const map: Record<string, boolean> = {};
            res.forEach((r) => (map[r.folderId] = true));
            return map;
          }),
      ),
      import("@/lib/auth").then((m) => m.isPrivateFolder),
    ]);

  let initialFiles: any[] | undefined = undefined;
  let initialNextPageToken: string | null = null;

  const isLocked = protectedStatus || isPrivateFolder(cleanFolderId);

  if (!isLocked) {
    try {
      const data = await listFilesFromDrive(cleanFolderId, null, 50, true);
      initialFiles = data.files.map((f) => {
        const isProt = !!(allProtectedFolders as any)[f.id];
        const isPriv = isPrivateFolder(f.id);
        return {
          ...f,
          isProtected: isProt || isPriv,
        };
      });
      initialNextPageToken = data.nextPageToken;
    } catch (e) {
      console.error("ISR Fetch error:", e);
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
