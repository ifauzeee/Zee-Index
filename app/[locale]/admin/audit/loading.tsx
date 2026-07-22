import { TableSkeleton } from "@/components/admin/skeletons";

export default function AuditLoading() {
  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-muted/60 animate-pulse rounded-2xl" />
        <div className="space-y-2">
          <div className="h-7 w-28 bg-muted/60 animate-pulse rounded-md" />
          <div className="h-4 w-48 bg-muted/60 animate-pulse rounded-md" />
        </div>
      </div>
      <div className="bg-card border rounded-2xl overflow-hidden">
        <TableSkeleton rows={10} columns={5} />
      </div>
    </div>
  );
}
