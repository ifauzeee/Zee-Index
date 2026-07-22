import { CardSkeleton } from "@/components/admin/skeletons";

export default function IncidentsLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 bg-muted/60 animate-pulse rounded-md" />
          <div className="h-4 w-52 bg-muted/60 animate-pulse rounded-md" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-muted/60 animate-pulse rounded-lg" />
          <div className="h-10 w-28 bg-muted/60 animate-pulse rounded-lg" />
        </div>
      </div>
      <CardSkeleton count={4} />
    </div>
  );
}
