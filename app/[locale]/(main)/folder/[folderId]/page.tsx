import FileBrowser from "@/components/file-browser/FileBrowser";
import { getFolderPath, listFilesFromDrive } from "@/lib/drive";
import { isProtected } from "@/lib/auth";

export const revalidate = 3600;

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
      import("@/lib/kv").then((m) =>
        m.kv
          .hgetall<Record<string, unknown>>("zee-index:protected-folders")
          .then((res) => res || {}),
      ),
      import("@/lib/auth").then((m) => m.isPrivateFolder),
    ]);

  let initialData: { files: any[]; nextPageToken: string | null } = {
    files: [],
    nextPageToken: null,
  };
  if (!protectedStatus) {
    try {
      const data = await listFilesFromDrive(cleanFolderId, null, 50, true);
      initialData = {
        files: data.files.map((f) => {
          const isProt = !!(allProtectedFolders as any)[f.id];
          const isPriv = isPrivateFolder(f.id);
          return {
            ...f,
            isProtected: isProt || isPriv,
          };
        }),
        nextPageToken: data.nextPageToken,
      };
    } catch (e) {
      console.error("ISR Fetch error:", e);
    }
  }

  return (
    <FileBrowser
      initialFolderId={cleanFolderId}
      initialFolderPath={folderPath}
      initialFiles={initialData.files}
      initialNextPageToken={initialData.nextPageToken}
    />
  );
}
