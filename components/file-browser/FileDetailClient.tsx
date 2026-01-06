"use client";
import dynamic from "next/dynamic";
import Loading from "@/components/common/Loading";

const FileDetail = dynamic(() => import("./FileDetail"), {
  ssr: false,
  loading: () => <Loading />,
});

export default FileDetail;
