"use client";
import React from "react";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import Masonry from "react-masonry-css";
import { MASONRY_BREAKPOINTS } from "@/lib/utils";

const SkeletonItem = ({ view }: { view: "list" | "grid" | "gallery" }) => {
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

  const randomHeight =
    view === "gallery"
      ? Math.floor(Math.random() * (350 - 150 + 1) + 150)
      : 160;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center bg-card border border-border/50 shadow-sm rounded-lg w-full overflow-hidden ${view === "gallery" ? "mb-4" : ""}`}
    >
      <div
        className="w-full bg-muted animate-pulse"
        style={{ height: `${randomHeight}px` }}
      ></div>
      <div className="p-3 w-full">
        <div className="h-4 bg-muted rounded w-3/4 mx-auto animate-pulse"></div>
        <div className="h-3 bg-muted rounded w-1/2 mx-auto mt-2 animate-pulse"></div>
      </div>
    </div>
  );
};

const FileBrowserLoading = () => {
  const { view } = useAppStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  if (view === "gallery") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Masonry
          breakpointCols={MASONRY_BREAKPOINTS}
          className="flex w-auto -ml-4"
          columnClassName="pl-4 bg-clip-padding"
        >
          {Array.from({ length: 12 }).map((_, index) => (
            <SkeletonItem key={index} view={view} />
          ))}
        </Masonry>
      </motion.div>
    );
  }

  const containerClass =
    view === "list"
      ? "flex flex-col gap-2"
      : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4";

  return (
    <motion.div
      className={containerClass}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {Array.from({ length: 12 }).map((_, index) => (
        <SkeletonItem key={index} view={view} />
      ))}
    </motion.div>
  );
};

export default FileBrowserLoading;