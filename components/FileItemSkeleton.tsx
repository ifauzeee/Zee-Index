"use client";

import React from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const SkeletonItem = ({ view }: { view: "list" | "grid" }) => {
  if (view === "list") {
    return (
      <div className="flex items-center p-3 bg-card border border-border/50 shadow-sm rounded-lg w-full h-[68px]">
        <div className="w-7 h-7 bg-muted rounded-md animate-pulse shrink-0"></div>
        <div className="ml-4 flex-1">
          <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
          <div className="h-3 bg-muted rounded w-1/2 mt-2 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-2 sm:p-4 bg-card border border-border/50 shadow-sm rounded-lg w-full aspect-square">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-md animate-pulse"></div>
      <div className="h-4 bg-muted rounded w-3/4 mt-3 animate-pulse"></div>
      <div className="h-3 bg-muted rounded w-1/2 mt-2 animate-pulse"></div>
    </div>
  );
};

const FileItemSkeleton = () => {
  const { view } = useAppStore();

  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <motion.div variants={itemVariants}>
      <SkeletonItem view={view} />
    </motion.div>
  );
};

export default FileItemSkeleton;
