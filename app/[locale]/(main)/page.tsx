import FileBrowser from "@/components/file-browser/FileBrowser";
import { listFilesFromDrive, type DriveFile } from "@/lib/drive";
import { getRootFolderId } from "@/lib/config";

export const revalidate = 3600;

type ProtectedFolderMap = Record<string, boolean>;

export default async function Home() {
  const rootId = await getRootFolderId();

  const [isProtected, isPrivateFolder, db] = await Promise.all([
    import("@/lib/auth").then((m) => m.isProtected),
    import("@/lib/auth").then((m) => m.isPrivateFolder),
    import("@/lib/db").then((m) => m.db),
  ]);

  let initialFiles: DriveFile[] | undefined;
  let initialNextPageToken: string | null = null;

  const isLocked = (await isProtected(rootId)) || isPrivateFolder(rootId);

  if (!isLocked) {
    try {
      const [data, allProtectedFolders] = await Promise.all([
        listFilesFromDrive(rootId, null, 50, true),
        db.protectedFolder
          .findMany({ select: { folderId: true } })
          .then((res: { folderId: string }[]) => {
            const map: ProtectedFolderMap = {};
            res.forEach((entry) => {
              map[entry.folderId] = true;
            });
            return map;
          }),
      ]);

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
      console.error("ISR Root fetch error:", e);
      initialFiles = [];
    }
  }

  return (
    <FileBrowser
      initialFolderId={rootId}
      initialFiles={initialFiles}
      initialNextPageToken={initialNextPageToken}
    />
  );
}
