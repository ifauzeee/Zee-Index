import React from "react";

interface FileItemSkeletonProps {
  viewMode?: "list" | "grid";
}

export default function FileItemSkeleton({
  viewMode = "list",
}: FileItemSkeletonProps) {
  if (viewMode === "grid") {
    return (
      <div className="group relative flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all overflow-hidden">
        <div className="aspect-square w-full overflow-hidden rounded-lg shimmer" />
        <div className="space-y-3 pt-1">
          <div className="h-4 w-3/4 shimmer rounded-md" />
          <div className="h-3 w-1/2 shimmer rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 p-3 border-b last:border-0 overflow-hidden">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="size-10 shrink-0 rounded-lg shimmer" />
        <div className="flex flex-col gap-2.5 flex-1 max-w-[300px]">
          <div className="h-4 w-3/4 shimmer rounded-md" />
          <div className="h-3 w-1/3 shimmer rounded-md block md:hidden" />
        </div>
      </div>

      <div className="hidden md:block w-[100px] shrink-0">
        <div className="h-4 w-12 shimmer rounded-md ml-auto" />
      </div>

      <div className="hidden lg:block w-[180px] shrink-0">
        <div className="h-4 w-24 shimmer rounded-md ml-auto" />
      </div>

      <div className="w-10 shrink-0 flex justify-end">
        <div className="size-8 rounded-full shimmer" />
      </div>
    </div>
  );
}
