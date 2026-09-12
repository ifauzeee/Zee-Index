"use client";

import dynamic from "next/dynamic";
import ApiKeysLoading from "./loading";

const ApiKeyManager = dynamic(
  () => import("@/components/admin/ApiKeyManager"),
  { ssr: false, loading: () => <ApiKeysLoading /> },
);

export default function ApiKeysPage() {
  return (
    <div className="py-6">
      <ApiKeyManager />
    </div>
  );
}
