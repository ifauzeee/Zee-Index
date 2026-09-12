"use client";

import dynamic from "next/dynamic";
import IncidentsLoading from "./loading";

const IncidentMonitor = dynamic(
  () => import("@/components/admin/IncidentMonitor"),
  { ssr: false, loading: () => <IncidentsLoading /> },
);

export default function IncidentsPage() {
  return (
    <div className="py-6">
      <IncidentMonitor />
    </div>
  );
}
