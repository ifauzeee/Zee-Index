"use client";

import dynamic from "next/dynamic";

const ApiKeyManager = dynamic(
  () => import("@/components/admin/ApiKeyManager"),
  { ssr: false },
);

export default function ApiKeysPage() {
  return <ApiKeyManager />;
}
