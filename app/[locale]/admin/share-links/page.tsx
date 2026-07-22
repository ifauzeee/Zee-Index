"use client";

import dynamic from "next/dynamic";
import ShareLinksLoading from "./loading";

const ShareLinkManager = dynamic(
  () => import("@/components/admin/ShareLinkManager"),
  { ssr: false, loading: () => <ShareLinksLoading /> },
);

export default function ShareLinksPage() {
  return <ShareLinkManager />;
}
