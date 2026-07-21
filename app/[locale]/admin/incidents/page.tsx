"use client";

import dynamic from "next/dynamic";

const IncidentMonitor = dynamic(
  () => import("@/components/admin/IncidentMonitor"),
  { ssr: false },
);

export default function IncidentsPage() {
  return <IncidentMonitor />;
}
