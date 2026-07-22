import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted/60", className)} />
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="p-4 space-y-3">
      {/* Header row */}
      <div className="flex gap-4 pb-3 border-b border-border">
        {Array.from({ length: columns }).map((_, c) => (
          <SkeletonBlock
            key={`h-${c}`}
            className={cn(
              "h-4",
              c === 0 ? "w-1/4" : c === columns - 1 ? "w-1/6" : "flex-1",
            )}
          />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, c) => (
            <SkeletonBlock
              key={`c-${r}-${c}`}
              className={cn(
                "h-3.5",
                c === 0 ? "w-1/4" : c === columns - 1 ? "w-1/6" : "flex-1",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-xl p-5 space-y-3"
        >
          <div className="flex items-start gap-3">
            <SkeletonBlock className="w-9 h-9 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <SkeletonBlock className="h-4 w-3/5" />
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-4/5" />
            </div>
            <SkeletonBlock className="h-6 w-16 rounded-full shrink-0" />
          </div>
          <div className="flex gap-2 pt-1">
            <SkeletonBlock className="h-8 w-20 rounded-lg" />
            <SkeletonBlock className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({
  count = 4,
  columns = 1,
}: {
  count?: number;
  columns?: number;
}) {
  const gridCols =
    columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-3" : "";

  return (
    <div className={cn("grid gap-4", gridCols)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <SkeletonBlock className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <SkeletonBlock className="h-4 w-2/3" />
                <SkeletonBlock className="h-3 w-1/3" />
              </div>
            </div>
            <SkeletonBlock className="h-6 w-14 rounded-full shrink-0" />
          </div>
          <SkeletonBlock className="h-3 w-full" />
          <div className="flex gap-2 pt-1">
            <SkeletonBlock className="h-8 w-16 rounded-lg" />
            <SkeletonBlock className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border rounded-xl p-4 sm:p-6 space-y-3"
          >
            <SkeletonBlock className="w-12 h-12 rounded-full" />
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-6 w-16" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-28 rounded-xl" />
        ))}
      </div>
      <SkeletonBlock className="h-64 w-full rounded-xl" />
    </div>
  );
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border rounded-xl p-4 space-y-2">
          <SkeletonBlock className="w-8 h-8 rounded-full" />
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-5 w-12" />
        </div>
      ))}
    </div>
  );
}

const CHART_BAR_HEIGHTS = [
  "80%",
  "45%",
  "65%",
  "30%",
  "90%",
  "55%",
  "40%",
  "70%",
];

export function ChartSkeleton({ height }: { height?: string }) {
  return (
    <div className="bg-card border rounded-xl p-4 animate-pulse space-y-4">
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="h-3 w-48" />
      <div
        className="flex items-end gap-2 pt-4"
        style={{ height: height || "8rem" }}
      >
        {CHART_BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md animate-pulse bg-muted/60"
            style={{ height: h }}
          />
        ))}
      </div>
    </div>
  );
}

export function UserListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card border rounded-xl p-4 flex items-center gap-3"
        >
          <SkeletonBlock className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3.5 w-2/5" />
            <SkeletonBlock className="h-3 w-3/5" />
          </div>
          <SkeletonBlock className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-5 animate-pulse">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBlock className="h-3.5 w-24" />
          <SkeletonBlock className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <SkeletonBlock className="h-10 w-28 rounded-lg" />
    </div>
  );
}

export function HealthCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="w-4 h-4 rounded" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
            <SkeletonBlock className="h-5 w-14 rounded-full" />
          </div>
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function LogListSkeleton({
  rows = 5,
  count,
}: {
  rows?: number;
  count?: number;
}) {
  const total = count ?? rows;
  return (
    <div className="space-y-1 animate-pulse">
      <div className="flex gap-4 pb-3 border-b border-border">
        {Array.from({ length: 4 }).map((_, c) => (
          <SkeletonBlock
            key={`h-${c}`}
            className={cn("h-3", c === 0 ? "w-1/4" : "flex-1")}
          />
        ))}
      </div>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          {Array.from({ length: 4 }).map((_, c) => (
            <SkeletonBlock
              key={`c-${i}-${c}`}
              className={cn("h-3", c === 0 ? "w-1/4" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
