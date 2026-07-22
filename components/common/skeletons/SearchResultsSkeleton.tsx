"use client";

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse p-4">
      <div className="h-4 w-40 bg-muted/60 rounded-md mb-6" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border rounded-xl p-4 flex items-start gap-3"
        >
          <div className="w-10 h-10 bg-muted/60 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-4 w-3/5 bg-muted/60 rounded-md" />
            <div className="h-3 w-4/5 bg-muted/60 rounded-md" />
            <div className="h-3 w-2/5 bg-muted/60 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
