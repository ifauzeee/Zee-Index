import FileBrowser from "@/components/FileBrowser";
import { getFolderPath } from "@/lib/googleDrive";

export default async function FolderPage({
  params,
}: {
  params: { folderId: string };
}) {
  const folderPath = await getFolderPath(params.folderId);
  return (
    <FileBrowser
      initialFolderId={params.folderId}
      initialFolderPath={folderPath}
    />
  );
}
