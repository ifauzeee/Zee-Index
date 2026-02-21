import FileBrowser from "@/components/file-browser/FileBrowser";
import { listFilesFromDrive } from "@/lib/drive";

export const revalidate = 3600;

export default async function Home() {
  const rootId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;

  const [isProtected, isPrivateFolder, db] = await Promise.all([
    import("@/lib/auth").then((m) => m.isProtected),
    import("@/lib/auth").then((m) => m.isPrivateFolder),
    import("@/lib/db").then((m) => m.db),
  ]);

  let initialFiles: any[] | undefined = undefined;
  let initialNextPageToken: string | null = null;

  const isLocked = (await isProtected(rootId)) || isPrivateFolder(rootId);

  if (!isLocked) {
    try {
      const [data, allProtectedFolders] = await Promise.all([
        listFilesFromDrive(rootId, null, 50, true),
        db.protectedFolder
          .findMany({ select: { folderId: true } })
          .then((res) => {
            const map: Record<string, boolean> = {};
            res.forEach((r) => (map[r.folderId] = true));
            return map;
          }),
      ]);

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
