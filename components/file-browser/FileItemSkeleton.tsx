import React from "react";

interface FileItemSkeletonProps {
  viewMode?: "list" | "grid";
}

export default function FileItemSkeleton({
  viewMode = "list",
}: FileItemSkeletonProps) {
  if (viewMode === "grid") {
    return (
      <div className="group relative flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm transition-all animate-pulse">
        <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted/40" />
        <div className="space-y-2 pt-1">
          <div className="h-4 w-3/4 bg-muted/40 rounded-md" />
          <div className="h-3 w-1/2 bg-muted/40 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 p-3 border-b last:border-0 animate-pulse">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="size-10 shrink-0 rounded-lg bg-muted/40" />
        <div className="flex flex-col gap-2 flex-1 max-w-[300px]">
          <div className="h-4 w-3/4 bg-muted/40 rounded-md" />
          <div className="h-3 w-1/3 bg-muted/40 rounded-md block md:hidden" />
        </div>
      </div>

      <div className="hidden md:block w-[100px] shrink-0">
        <div className="h-4 w-12 bg-muted/40 rounded-md ml-auto" />
      </div>

      <div className="hidden lg:block w-[180px] shrink-0">
        <div className="h-4 w-24 bg-muted/40 rounded-md ml-auto" />
      </div>

      <div className="w-10 shrink-0 flex justify-end">
        <div className="size-8 rounded-full bg-muted/40" />
      </div>
    </div>
  );
}
