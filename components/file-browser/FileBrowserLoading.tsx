"use client";

import React from "react";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import FileItemSkeleton from "@/components/file-browser/FileItemSkeleton";

const FileBrowserLoading = () => {
  const { view } = useAppStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const containerClass =
    view === "list"
      ? "flex flex-col gap-2"
      : "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4";

  return (
    <motion.div
      className={containerClass}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {Array.from({ length: 12 }).map((_, index) => (
        <FileItemSkeleton key={index} />
      ))}
    </motion.div>
  );
};

export default FileBrowserLoading;
