import { ListSkeleton } from "@/components/admin/skeletons";

export default function ProtectedFoldersLoading() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 bg-muted/60 animate-pulse rounded-md" />
        <div className="h-4 w-60 bg-muted/60 animate-pulse rounded-md" />
      </div>
      <div className="bg-card border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-5 w-28 bg-muted/60 animate-pulse rounded-md" />
          <div className="h-5 w-20 bg-muted/60 animate-pulse rounded-full" />
        </div>
        <ListSkeleton count={3} columns={2} />
      </div>
    </div>
  );
}
