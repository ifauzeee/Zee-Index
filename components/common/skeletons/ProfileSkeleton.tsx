"use client";

export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-muted/60 rounded-full" />
        <div className="space-y-2">
          <div className="h-5 w-32 bg-muted/60 rounded-md" />
          <div className="h-3.5 w-48 bg-muted/60 rounded-md" />
        </div>
      </div>
      {/* Info cards */}
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-muted/60 rounded" />
              <div className="h-4 w-24 bg-muted/60 rounded-md" />
            </div>
            <div className="h-3.5 w-full bg-muted/60 rounded-md" />
            <div className="h-3.5 w-3/4 bg-muted/60 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
