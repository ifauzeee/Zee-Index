"use client";

import dynamic from "next/dynamic";
import ApiKeysLoading from "./loading";

const ApiKeyManager = dynamic(
  () => import("@/components/admin/ApiKeyManager"),
  { ssr: false, loading: () => <ApiKeysLoading /> },
);

export default function ApiKeysPage() {
  return <ApiKeyManager />;
}
