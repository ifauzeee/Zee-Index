import dynamic from "next/dynamic";
import Loading from "@/components/Loading";

const FileBrowser = dynamic(() => import("@/components/FileBrowser"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function FolderPage({
  params,
}: {
  params: { folderId: string };
}) {
  return <FileBrowser initialFolderId={params.folderId} />;
}