import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from "@/lib/store";
import { formatBytes, getIcon, cn } from "@/lib/utils";
import React, { useRef } from "react";
import { motion, Variants } from "framer-motion";
import Image from "next/image";
import { Lock, Star, Share2, Download, Info } from "lucide-react";

interface FileItemProps {
  file: DriveFile & { isFavorite?: boolean };
  onClick: () => void;
  onContextMenu: (
    event: { clientX: number; clientY: number },
    file: DriveFile,
  ) => void;
  isSelected: boolean;
  isActive: boolean;
  isBulkMode: boolean;
  onShare: (e: React.MouseEvent) => void;
  onShowDetails: (e: React.MouseEvent) => void;
  onDownload: (e: React.MouseEvent) => void;
  isAdmin: boolean;
}

export default function FileItem({
  file,
  onClick,
  onContextMenu,
  isSelected,
  isActive,
  isBulkMode,
  onShare,
  onShowDetails,
  onDownload,
  isAdmin,
}: FileItemProps) {
  const { view } = useAppStore();
  const Icon = getIcon(file.mimeType);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressFired = useRef(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    longPressFired.current = false;
    timerRef.current = setTimeout(() => {
      longPressFired.current = true;
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      onContextMenu(e.touches[0], file);
    }, 500);
  };

  const handleTouchMove = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (longPressFired.current) {
      e.preventDefault();
      longPressFired.current = false;
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.3, ease: [0.2, 0, 0.2, 1] },
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 },
    },
  };
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={cn(
        "group relative rounded-lg transition-all duration-200 ease-out cursor-pointer",
        isSelected && "bg-accent/80 ring-2 ring-primary",
        isActive && !isBulkMode && "ring-2 ring-primary/50",
        view === "list"
          ? "flex items-center p-3 bg-card border border-border shadow-sm hover:shadow-md hover:bg-accent/50"
          : "flex flex-col items-center justify-center text-center p-2 sm:p-4 bg-card border border-border shadow-sm hover:shadow-md w-full",
      )}
      onClick={onClick}
      onContextMenu={(e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        onContextMenu({ clientX: e.clientX, clientY: e.clientY }, file);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={cn(
          "flex w-full",
          view === "list"
            ? "items-center gap-4"
            : "flex-col items-center justify-center gap-2",
        )}
      >
        <div className="relative">
          {view === "grid" && file.thumbnailLink && !file.isFolder ? (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden flex items-center justify-center">
              <Image
                src={file.thumbnailLink}
                alt={file.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 80px, 96px"
                priority={false}
              />
            </div>
          ) : (
            <div
              className={cn(
                "text-3xl text-primary shrink-0 flex items-center justify-center",
                view === "grid" && "text-4xl mb-2",
              )}
            >
              {React.createElement(Icon, { size: view === "grid" ? 48 : 28 })}
            </div>
          )}

          {view === "grid" && file.isProtected && (
            <div className="absolute -bottom-1 -right-1 flex items-center justify-center p-1.5 bg-background/60 backdrop-blur-sm rounded-full ring-2 ring-background/20">
              <Lock size={12} className="text-primary" />
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex-1 min-w-0",
            view === "grid" && "mt-2 w-full text-center",
          )}
        >
          <p
            className={cn(
              "font-medium truncate flex items-center gap-1.5",
              view === "list"
                ? "text-sm justify-start"
                : "text-xs sm:text-sm justify-center",
            )}
            title={file.name}
          >
            {file.isFavorite && (
              <Star
                size={12}
                className="text-yellow-400 fill-yellow-400 shrink-0"
              />
            )}
            {view === "list" && file.isProtected && (
              <Lock size={12} className="text-muted-foreground shrink-0" />
            )}
            <span className="truncate">{file.name}</span>
          </p>

          {view === "list" && !file.isFolder && (
            <p className="text-xs text-muted-foreground mt-1 text-left">
              {file.size ? formatBytes(parseInt(file.size)) : "-"} •{" "}
              {new Date(file.modifiedTime).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
          {view === "grid" && !file.isFolder && (
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {file.size ? formatBytes(parseInt(file.size)) : "-"}
            </p>
          )}
        </div>

        {view === "list" && !isBulkMode && (
          <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 focus-within:opacity-100">
            {isAdmin && (
              <button
                onClick={onShare}
                title="Bagikan"
                className="p-2 rounded-full hover:bg-muted"
              >
                <Share2 size={16} />
              </button>
            )}
            {!file.isFolder && (
              <button
                onClick={onDownload}
                title="Unduh"
                className="p-2 rounded-full hover:bg-muted"
              >
                <Download size={16} />
              </button>
            )}
            <button
              onClick={onShowDetails}
              title="Lihat Detail"
              className="p-2 rounded-full hover:bg-muted"
            >
              <Info size={16} />
            </button>
          </div>
        )}

        {isBulkMode && (
          <input
            type="checkbox"
            checked={isSelected}
            readOnly
            className={cn(
              "absolute h-5 w-5 pointer-events-none",
              view === "list"
                ? "right-4 top-1/2 -translate-y-1/2"
                : "top-2 right-2",
              "rounded border-primary text-primary focus:ring-primary",
            )}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </motion.div>
  );
}