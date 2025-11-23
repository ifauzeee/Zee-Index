import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from "@/lib/store";
import { formatBytes, getIcon, cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { motion, Variants } from "framer-motion";
import Image from "next/image";
import { Lock, Star, Share2, Download, Info, ImageOff } from "lucide-react";

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
  onDragStart: (e: React.DragEvent) => void;
  onFileDrop: (e: React.DragEvent, targetFolder: DriveFile) => void;
  onMouseEnter?: () => void;
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
  onDragStart,
  onFileDrop,
  onMouseEnter,
}: FileItemProps) {
  const { view, shareToken } = useAppStore();
  const Icon = getIcon(file.mimeType);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressFired = useRef(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    longPressFired.current = false;
    timerRef.current = setTimeout(() => {
      longPressFired.current = true;
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      onContextMenu(e.touches[0], file);
    }, 250);
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
      transition: { duration: 0.2 },
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.1 },
    },
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (file.isFolder && isAdmin) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (file.isFolder && isAdmin) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      onFileDrop(e, file);
    }
  };

  const getThumbnailSrc = () => {
    if (file.thumbnailLink) {
      return file.thumbnailLink.replace(/=s\d+/, "=s800");
    }
    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) url += `&share_token=${shareToken}`;
    return url;
  };

  const isGallery = view === "gallery";
  const hasImage =
    (file.mimeType.startsWith("image/") || file.thumbnailLink) &&
    !file.isFolder &&
    !imageError;

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={cn(isGallery && "mb-4")}
      onMouseEnter={onMouseEnter}
    >
      <div
        className={cn(
          "group relative rounded-lg transition-all duration-200 ease-out cursor-pointer overflow-hidden select-none",
          isSelected && "bg-accent/80 ring-2 ring-primary",
          isActive && !isBulkMode && "ring-2 ring-primary/50",
          view === "list"
            ? "flex items-center p-3 bg-card border border-border shadow-sm hover:shadow-md hover:bg-accent/50"
            : "bg-card border border-border shadow-sm hover:shadow-md w-full",
          view === "grid" &&
            "flex flex-col items-center justify-center text-center p-2 sm:p-4",
          isGallery && "p-0",
          isDragOver && "ring-2 ring-primary ring-inset bg-primary/10",
        )}
        onClick={onClick}
        onContextMenu={(e: React.MouseEvent<HTMLDivElement>) => {
          e.preventDefault();
          onContextMenu({ clientX: e.clientX, clientY: e.clientY }, file);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        draggable={isAdmin}
        onDragStart={onDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={cn(
            "flex w-full",
            view === "list"
              ? "items-center gap-4"
              : view === "grid"
                ? "flex-col items-center justify-center gap-2"
                : "flex-col",
          )}
        >
          <div className={cn("relative", isGallery && "w-full min-h-[150px]")}>
            {isGallery && hasImage ? (
              <div className="relative w-full bg-muted/20">
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/30 animate-pulse z-10">
                    <Icon size={32} className="opacity-20" />
                  </div>
                )}
                <Image
                  src={getThumbnailSrc()}
                  alt={file.name}
                  width={0}
                  height={0}
                  sizes="100vw"
                  style={{ width: "100%", height: "auto" }}
                  className={cn(
                    "object-cover block transition-opacity duration-300",
                    isImageLoading ? "opacity-0" : "opacity-100",
                  )}
                  onLoad={() => setIsImageLoading(false)}
                  onError={() => {
                    setIsImageLoading(false);
                    setImageError(true);
                  }}
                  unoptimized
                />
                {file.isProtected && (
                  <div className="absolute bottom-2 right-2 flex items-center justify-center p-1.5 bg-background/60 backdrop-blur-sm rounded-full ring-2 ring-background/20 z-20">
                    <Lock size={12} className="text-primary" />
                  </div>
                )}
              </div>
            ) : view === "grid" && hasImage ? (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden flex items-center justify-center bg-muted/20">
                <Image
                  src={file.thumbnailLink || getThumbnailSrc()}
                  alt={file.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 80px, 96px"
                  referrerPolicy="no-referrer"
                  unoptimized={true}
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div
                className={cn(
                  "text-3xl text-primary shrink-0 flex items-center justify-center",
                  view === "grid" && "text-4xl mb-2",
                  isGallery &&
                    "py-8 text-6xl bg-accent/10 w-full flex flex-col gap-2",
                )}
              >
                {React.createElement(Icon, {
                  size: view === "grid" ? 48 : isGallery ? 64 : 28,
                })}
                {isGallery && imageError && (
                  <span className="text-xs text-muted-foreground mt-2">
                    <ImageOff size={16} className="inline mr-1" />
                    Gagal muat
                  </span>
                )}
              </div>
            )}

            {view !== "list" && file.isProtected && !isGallery && (
              <div className="absolute -bottom-1 -right-1 flex items-center justify-center p-1.5 bg-background/60 backdrop-blur-sm rounded-full ring-2 ring-background/20">
                <Lock size={12} className="text-primary" />
              </div>
            )}
          </div>

          <div
            className={cn(
              "flex-1 min-w-0",
              view === "grid" && "mt-2 w-full text-center",
              isGallery && "p-3",
            )}
          >
            <p
              className={cn(
                "font-medium truncate flex items-center gap-1.5",
                view === "list"
                  ? "text-sm justify-start"
                  : view === "grid"
                    ? "text-xs sm:text-sm justify-center"
                    : "text-sm",
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
            {(view === "grid" || view === "gallery") && !file.isFolder && (
              <p
                className={cn(
                  "text-xs text-muted-foreground mt-1",
                  view === "grid" ? "text-center" : "text-left",
                )}
              >
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
      </div>
    </motion.div>
  );
}
