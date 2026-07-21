"use client";

import dynamic from "next/dynamic";

const ShareLinkManager = dynamic(
  () => import("@/components/admin/ShareLinkManager"),
  { ssr: false },
);

export default function ShareLinksPage() {
  return <ShareLinkManager />;
}
