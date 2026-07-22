import { TableSkeleton } from "@/components/admin/skeletons";

export default function ActivityLogsLoading() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-muted/60 animate-pulse rounded-full" />
        <div className="h-8 w-36 bg-muted/60 animate-pulse rounded-md" />
      </div>
      <div className="bg-card border rounded-lg overflow-hidden">
        <TableSkeleton rows={8} columns={4} />
      </div>
    </div>
  );
}
