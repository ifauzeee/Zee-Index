"use client";

import dynamic from "next/dynamic";

const ProtectedFoldersManager = dynamic(
  () => import("@/components/admin/ProtectedFoldersManager"),
  { ssr: false },
);

export default function ProtectedFoldersPage() {
  return <ProtectedFoldersManager />;
}
