import FileBrowser from "@/components/file-browser/FileBrowser";
import { listFilesFromDrive } from "@/lib/drive";

export const revalidate = 3600;

export default async function Home() {
  const rootId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;

  let initialData: { files: any[]; nextPageToken: string | null } = {
    files: [],
    nextPageToken: null,
  };

  try {
    const data = await listFilesFromDrive(rootId, null, 50, true);
    initialData = {
      files: data.files.map((f) => ({ ...f, isProtected: false })),
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
