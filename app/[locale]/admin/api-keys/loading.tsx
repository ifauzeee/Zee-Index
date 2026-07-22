import { TableSkeleton } from "@/components/admin/skeletons";

export default function ApiKeysLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 bg-muted/60 animate-pulse rounded-md" />
          <div className="h-4 w-48 bg-muted/60 animate-pulse rounded-md" />
        </div>
        <div className="h-10 w-28 bg-muted/60 animate-pulse rounded-lg" />
      </div>
      <div className="bg-card border rounded-xl overflow-hidden">
        <TableSkeleton rows={5} columns={5} />
      </div>
    </div>
  );
}
