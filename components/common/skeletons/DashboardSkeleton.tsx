"use client";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border rounded-xl p-4 space-y-3">
            <div className="w-10 h-10 bg-muted/60 rounded-full" />
            <div className="h-3 w-20 bg-muted/60 rounded-md" />
            <div className="h-6 w-16 bg-muted/60 rounded-md" />
          </div>
        ))}
      </div>
      {/* Recent activity */}
      <div className="bg-card border rounded-xl p-4 space-y-4">
        <div className="h-5 w-32 bg-muted/60 rounded-md" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted/60 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/5 bg-muted/60 rounded-md" />
              <div className="h-2.5 w-2/5 bg-muted/60 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
