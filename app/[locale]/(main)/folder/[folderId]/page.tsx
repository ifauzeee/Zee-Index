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

  const [folderPath, protectedStatus] = await Promise.all([
    getFolderPath(cleanFolderId, locale),
    isProtected(cleanFolderId),
  ]);

  let initialData: { files: any[]; nextPageToken: string | null } = {
    files: [],
    nextPageToken: null,
  };
  if (!protectedStatus) {
    try {
      const data = await listFilesFromDrive(cleanFolderId, null, 50, true);
      initialData = {
        files: data.files.map((f) => ({ ...f, isProtected: false })),
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
