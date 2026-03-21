import React from "react";
import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";

interface FileItemSkeletonProps {
  viewMode?: "list" | "grid" | "gallery";
  density?: "comfortable" | "compact";
}

export default function FileItemSkeleton({
  viewMode = "list",
  density = "comfortable",
}: FileItemSkeletonProps) {
  const compactClass = density === "compact" && viewMode === "list";

  if (viewMode === "gallery") {
    return (
      <div className="w-full mb-4">
        <div className="group relative rounded-lg overflow-hidden w-full border bg-card/50">
          <div className="w-full min-h-[150px] shimmer" />
          <div className="p-3">
            <div className="h-4 w-3/4 shimmer rounded-md mb-2" />
            <div className="h-3 w-1/2 shimmer rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="group relative border rounded-lg bg-card p-3 flex flex-col gap-3 h-[200px] shadow-sm">
        <div className="flex-1 w-full rounded flex items-center justify-center overflow-hidden shimmer" />
        <div className="flex items-start justify-between gap-2 mt-auto">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-5/6 shimmer rounded-md" />
            <div className="h-3 w-1/2 shimmer rounded-md" />
          </div>
          <MoreVertical className="w-4 h-4 text-muted/30 shrink-0" />
        </div>
      </div>
    );
  }

  // List (comfortable or compact)
  return (
    <div className="w-full max-w-full">
      <div
        className={cn(
          "group relative rounded-lg overflow-hidden w-full border bg-card shadow-sm flex items-center",
          compactClass ? "p-1.5 min-h-[40px]" : "p-3 min-h-[68px]"
        )}
      >
        <div className="flex items-center gap-3 w-full">
          <div
            className={cn(
              "shrink-0 rounded flex items-center justify-center shimmer",
              compactClass ? "w-6 h-6" : "w-10 h-10"
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="h-4 w-1/3 shimmer rounded-md mb-2" />
            {!compactClass && (
              <div className="h-3 w-1/4 shimmer rounded-md" />
            )}
          </div>
          
          <div className="hidden md:flex items-center gap-2 ml-auto shrink-0 mr-4">
             <div className="w-8 h-8 rounded-full shimmer" />
             <div className="w-8 h-8 rounded-full shimmer" />
             <div className="w-8 h-8 rounded-full shimmer" />
          </div>

          <div className="md:hidden shrink-0">
            <MoreVertical className="w-4 h-4 text-muted/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
