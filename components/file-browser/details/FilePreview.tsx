"use client";

import React from "react";
import { motion } from "framer-motion";
import type { DriveFile } from "@/lib/drive";
import { getIcon } from "@/lib/utils";
import Image from "next/image";
import { itemVariants, contentVariants } from "./DetailComponents";

interface FilePreviewProps {
  file: DriveFile;
  variant: "desktop" | "mobile";
}

export default function FilePreview({ file, variant }: FilePreviewProps) {
  const FileIconComponent = getIcon(file.mimeType);

  const sizeClasses =
    variant === "desktop"
      ? "w-64 h-64 xl:w-80 xl:h-80 rounded-[2.5rem]"
      : "w-40 h-40 sm:w-48 sm:h-48 rounded-[2rem]";

  const titleClass =
    variant === "desktop"
      ? "font-bold text-2xl leading-snug break-words select-all"
      : "font-bold text-xl leading-snug break-words select-all";

  const mimeClass =
    variant === "desktop"
      ? "text-sm font-medium text-muted-foreground font-mono bg-muted/50 px-4 py-2 rounded-full inline-block border border-border/50"
      : "text-xs font-medium text-muted-foreground font-mono bg-muted/50 px-3 py-1 rounded-full inline-block border border-border/50";

  const wrapperClass =
    variant === "desktop"
      ? "hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:w-1/2 lg:p-12 lg:border-r lg:border-border/40"
      : "flex flex-col items-center gap-6 pt-2 lg:hidden";

  return (
    <motion.div
      variants={variant === "desktop" ? contentVariants : itemVariants}
      initial="hidden"
      animate="visible"
      className={wrapperClass}
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative group">
          <motion.div
            whileHover={{ scale: 1.02, rotate: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`relative ${sizeClasses} shadow-xl bg-card border border-border/50 flex items-center justify-center overflow-hidden z-10`}
          >
            {file.thumbnailLink && !file.isFolder ? (
              <Image
                src={`/api/proxy-image?url=${encodeURIComponent(
                  file.thumbnailLink.replace("=s220", "=s800"),
                )}`}
                alt={file.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                unoptimized
              />
            ) : (
              <FileIconComponent size={80} className="text-foreground/20" />
            )}
          </motion.div>
        </div>

        <div
          className={`text-center w-full ${variant === "desktop" ? "px-4 space-y-3" : "px-2 space-y-2"}`}
        >
          <motion.h3 layout className={titleClass} title={file.name}>
            {file.name}
          </motion.h3>
          <span className={mimeClass}>{file.mimeType}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
