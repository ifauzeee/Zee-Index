"use client";
import dynamic from "next/dynamic";
import Loading from "@/components/common/Loading";

const FileBrowser = dynamic(() => import("./FileBrowser"), {
  ssr: false,
  loading: () => <Loading />,
});

export default FileBrowser;
