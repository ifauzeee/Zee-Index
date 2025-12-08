import FileBrowser from "@/components/FileBrowser";
import { getFolderPath } from "@/lib/googleDrive";

export default async function FolderPage({
  params,
}: {
  params: { folderId: string };
}) {
  const cleanFolderId = decodeURIComponent(params.folderId).split("&")[0].split("?")[0].trim();

  const folderPath = await getFolderPath(cleanFolderId);
  return (
    <FileBrowser
      initialFolderId={cleanFolderId}
      initialFolderPath={folderPath}
    />
  );
}