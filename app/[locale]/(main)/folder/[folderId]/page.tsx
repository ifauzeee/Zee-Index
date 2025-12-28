import FileBrowser from "@/components/file-browser/FileBrowser";
import { getFolderPath } from "@/lib/googleDrive";

export default async function FolderPage({
  params,
}: {
  params: { folderId: string; locale: string };
}) {
  const { folderId, locale } = params;
  const cleanFolderId = decodeURIComponent(folderId)
    .split("&")[0]
    .split("?")[0]
    .trim();

  const folderPath = await getFolderPath(cleanFolderId, locale);
  return (
    <FileBrowser
      initialFolderId={cleanFolderId}
      initialFolderPath={folderPath}
    />
  );
}
