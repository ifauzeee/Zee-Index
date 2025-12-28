import dynamic from "next/dynamic";
import Loading from "@/components/common/Loading";

const FileBrowser = dynamic(
  () => import("@/components/file-browser/FileBrowser"),
  {
    ssr: false,
    loading: () => <Loading />,
  },
);

export default function Home() {
  return <FileBrowser />;
}
