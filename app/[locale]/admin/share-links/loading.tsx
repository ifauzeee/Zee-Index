import { TableSkeleton } from "@/components/admin/skeletons";

export default function ShareLinksLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-muted/60 animate-pulse rounded-md" />
          <div className="h-4 w-56 bg-muted/60 animate-pulse rounded-md" />
        </div>
        <div className="h-10 w-28 bg-muted/60 animate-pulse rounded-lg" />
      </div>
      <div className="bg-card border rounded-xl overflow-hidden">
        <TableSkeleton rows={8} columns={6} />
      </div>
    </div>
  );
}
