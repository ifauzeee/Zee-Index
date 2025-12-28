import React from "react";

interface FileItemSkeletonProps {
  viewMode?: "list" | "grid";
}

export default function FileItemSkeleton({
  viewMode = "list",
}: FileItemSkeletonProps) {
  if (viewMode === "grid") {
    return (
      <div className="border rounded-lg p-3 flex flex-col gap-3 h-[200px] bg-card animate-pulse">
        <div className="flex-1 w-full bg-muted/40 rounded" />
        <div className="space-y-2">
          <div className="h-4 bg-muted/40 rounded w-3/4" />
          <div className="h-3 bg-muted/40 rounded w-1/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-0 animate-pulse">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-10 h-10 rounded bg-muted/40" />
        <div className="space-y-2 flex-1 max-w-[300px]">
          <div className="h-4 bg-muted/40 rounded w-3/4" />
          <div className="h-3 bg-muted/40 rounded w-1/2" />
        </div>
      </div>
      <div className="hidden md:block w-[100px] h-4 bg-muted/40 rounded" />
      <div className="hidden lg:block w-[150px] h-4 bg-muted/40 rounded ml-4" />
    </div>
  );
}
