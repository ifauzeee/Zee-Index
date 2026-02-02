import FileBrowser from "@/components/file-browser/FileBrowser";
import { getFolderPath } from "@/lib/drive";

export default async function FolderPage(props: {
  params: Promise<{ folderId: string; locale: string }>;
}) {
  const params = await props.params;
  const { folderId } = params;
  const cleanFolderId = decodeURIComponent(folderId)
    .split("&")[0]
    .split("?")[0]
    .trim();

  const folderPath = await getFolderPath(cleanFolderId);

  return (
    <FileBrowser
      initialFolderId={cleanFolderId}
      initialFolderPath={folderPath}
    />
  );
}
