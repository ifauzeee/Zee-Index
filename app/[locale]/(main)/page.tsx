import FileBrowser from "@/components/file-browser/FileBrowser";
import { listFilesFromDrive } from "@/lib/drive";

export const revalidate = 3600;

export default async function Home() {
  const rootId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;

  const [isProtected, isPrivateFolder, kv] = await Promise.all([
    import("@/lib/auth").then((m) => m.isProtected),
    import("@/lib/auth").then((m) => m.isPrivateFolder),
    import("@/lib/kv").then((m) => m.kv),
  ]);

  let initialData: { files: any[]; nextPageToken: string | null } = {
    files: [],
    nextPageToken: null,
  };

  try {
    const [data, allProtectedFolders] = await Promise.all([
      listFilesFromDrive(rootId, null, 50, true),
      kv
        .hgetall<Record<string, unknown>>("zee-index:protected-folders")
        .then((res) => res || {}),
    ]);

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
    console.error("ISR Root fetch error:", e);
  }

  return (
    <FileBrowser
      initialFolderId={rootId}
      initialFiles={initialData.files}
      initialNextPageToken={initialData.nextPageToken}
    />
  );
}
