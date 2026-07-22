"use client";

import dynamic from "next/dynamic";
import ProtectedFoldersLoading from "./loading";

const ProtectedFoldersManager = dynamic(
  () => import("@/components/admin/ProtectedFoldersManager"),
  { ssr: false, loading: () => <ProtectedFoldersLoading /> },
);

export default function ProtectedFoldersPage() {
  return <ProtectedFoldersManager />;
}
