import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from "@/lib/store";
import { formatBytes, getIcon, cn } from "@/lib/utils";
import React, { useRef, useState, useMemo, memo, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import Image from "next/image";
import {
  Lock,
  Star,
  Share2,
  Download,
  Info,
  ImageOff,
  Link as LinkIcon,
  XCircle,
} from "lucide-react";

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
  onToggleFavorite?: (e: React.MouseEvent) => void;
  isAdmin: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onFileDrop: (e: React.DragEvent, targetFolder: DriveFile) => void;
  onMouseEnter?: () => void;
  density?: "comfortable" | "compact";
  isShared?: boolean;
  uploadProgress?: number;
  uploadStatus?: "uploading" | "error" | "success";
  uploadError?: string;
}

function FileItem({
  file,
  onClick,
  onContextMenu,
  isSelected,
  isActive,
  isBulkMode,
  onShare,
  onShowDetails,
  onDownload,
  onToggleFavorite,
  isAdmin,
  onDragStart,
  onFileDrop,
  onMouseEnter,
  density = "comfortable",
  isShared = false,
  uploadProgress,
  uploadStatus,
  uploadError,
}: FileItemProps) {
  const { view, shareToken } = useAppStore();
  const Icon = getIcon(file.mimeType);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);

  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const isNew = useMemo(() => {
    const created = new Date(file.createdTime).getTime();
    const now = Date.now();
    return now - created < 24 * 60 * 60 * 1000;
  }, [file.createdTime]);

  const thumbnailSrc = useMemo(() => {
    if (file.thumbnailLink) {
      let size = "s800";
      if (view === "list") size = "s64";
      else if (view === "grid") size = "s320";
      else if (view === "gallery") size = "s1280";

      return file.thumbnailLink.replace(/=s\d+/, `=${size}`);
    }
    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) url += `&share_token=${shareToken}`;
    return url;
  }, [file.thumbnailLink, file.id, view, shareToken]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 1) return;

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    longPressTriggeredRef.current = false;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch (e) {}
      }

      onContextMenu({ clientX: touch.clientX, clientY: touch.clientY }, file);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!timerRef.current || !touchStartRef.current) return;

    const touch = e.touches[0];
    const moveX = Math.abs(touch.clientX - touchStartRef.current.x);
    const moveY = Math.abs(touch.clientY - touchStartRef.current.y);

    if (moveX > 25 || moveY > 25) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (longPressTriggeredRef.current) {
      if (e.cancelable) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    touchStartRef.current = null;
    
    setTimeout(() => {
      longPressTriggeredRef.current = false;
    }, 200);
  };

  const handleTouchCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    touchStartRef.current = null;
    longPressTriggeredRef.current = false;
  };

  const handleContextMenuEvent = (e: React.MouseEvent) => {
    const isTouch = (e.nativeEvent as any).pointerType === 'touch' || 'ontouchstart' in window;

    if (isTouch) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    onContextMenu({ clientX: e.clientX, clientY: e.clientY }, file);
  };

  const handleInteractionClick = (e: React.MouseEvent) => {
    if (isUploading) return;
    
    if (longPressTriggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick();
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2 },
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.1 },
    },
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (file.isFolder && isAdmin && !uploadStatus) {
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
    if (file.isFolder && isAdmin && !uploadStatus) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      onFileDrop(e, file);
    }
  };

  const isGallery = view === "gallery";
  const hasImage =
    (file.mimeType.startsWith("image/") || file.thumbnailLink) &&
    !file.isFolder &&
    !imageError;

  const compactClass = density === "compact" && view === "list";
  const isUploading = uploadStatus === "uploading";
  const isError = uploadStatus === "error";

  const isMobileView = typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches;

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover={!isUploading && !isMobileView ? "hover" : undefined}
      whileTap={!isUploading && isMobileView ? { scale: 0.98 } : undefined}
      className={cn(
        isGallery && "mb-4",
        isUploading && "opacity-80",
        "w-full max-w-full",
        "will-change-transform",
      )}
      onMouseEnter={onMouseEnter}
    >
      <div
        className={cn(
          "group relative rounded-lg transition-all duration-100 ease-out cursor-pointer overflow-hidden w-full",
          "select-none touch-pan-y [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]",
          isSelected && "bg-accent/80 ring-2 ring-primary",
          isActive && !isBulkMode && "ring-2 ring-primary/50",
          view === "list"
            ? cn(
                "flex items-center bg-card border border-border shadow-sm hover:shadow-md hover:bg-accent/50",
                compactClass ? "p-1.5 min-h-[40px]" : "p-3 min-h-[68px]",
              )
            : "bg-card border border-border shadow-sm hover:shadow-md w-full",
          view === "grid" &&
            "flex flex-col items-center justify-center text-center p-2 sm:p-4",
          isGallery && "p-0",
          isDragOver && "ring-2 ring-primary ring-inset bg-primary/10",
          isError && "ring-2 ring-destructive/50 bg-destructive/5",
        )}
        onClick={handleInteractionClick}
        onContextMenu={!isUploading ? handleContextMenuEvent : undefined}
        onTouchStart={!isUploading ? handleTouchStart : undefined}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        draggable={isAdmin && !isUploading && !isMobileView}
        onDragStart={onDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={cn(
            "flex w-full min-w-0",
            view === "list"
              ? "items-center gap-3"
              : view === "grid"
                ? "flex-col items-center justify-center gap-2"
                : "flex-col",
          )}
        >
          <div
            className={cn(
              "relative shrink-0",
              isGallery && "w-full min-h-[150px]",
            )}
          >
            {isGallery && hasImage ? (
              <div className="relative w-full bg-muted/20">
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
                    <Icon size={32} className="opacity-20" />
                  </div>
                )}
                <Image
                  src={thumbnailSrc}
                  alt={file.name}
                  width={0}
                  height={0}
                  sizes="100vw"
                  style={{ width: "100%", height: "auto" }}
                  className={cn(
                    "object-cover block transition-opacity duration-200",
                    isImageLoading ? "opacity-0" : "opacity-100",
                  )}
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setIsImageLoading(false)}
                  onError={() => {
                    setIsImageLoading(false);
                    setImageError(true);
                  }}
                  unoptimized
                />
                {file.isProtected && (
                  <div className="absolute bottom-2 right-2 flex items-center justify-center p-1.5 bg-background/60 rounded-full ring-2 ring-background/20 z-20">
                    <Lock size={12} className="text-primary" />
                  </div>
                )}
              </div>
            ) : view === "grid" && hasImage ? (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden flex items-center justify-center bg-muted/20">
                <Image
                  src={thumbnailSrc}
                  alt={file.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 80px, 150px"
                  loading="lazy"
                  decoding="async"
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
                  size:
                    view === "grid"
                      ? 48
                      : isGallery
                        ? 64
                        : compactClass
                          ? 20
                          : 28,
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
              <div
                className={cn(
                  "absolute flex items-center justify-center p-1.5 bg-background/60 rounded-full ring-2 ring-background/20 z-20",
                  isGallery ? "bottom-2 right-2" : "-bottom-1 -right-1",
                )}
              >
                <Lock size={12} className="text-primary" />
              </div>
            )}
          </div>

          <div
            className={cn(
              "flex-1 min-w-0 max-w-full",
              view === "grid" && "mt-2 w-full text-center",
              isGallery && "p-3",
            )}
          >
            <div
              className={cn(
                "font-medium flex items-center gap-1.5 min-w-0",
                view === "list"
                  ? "text-sm justify-start"
                  : view === "grid"
                    ? "text-xs sm:text-sm justify-center"
                    : "text-sm",
              )}
              title={file.name}
            >
              {file.isFavorite && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite?.(e);
                  }}
                  className="hover:bg-muted p-0.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 shrink-0"
                  title="Hapus dari favorit"
                >
                  <Star
                    size={12}
                    className="text-yellow-400 fill-yellow-400 shrink-0"
                  />
                </button>
              )}
              {view === "list" && file.isProtected && (
                <Lock size={12} className="text-muted-foreground shrink-0" />
              )}

              {view === "list" ? (
                <div className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap no-scrollbar mask-gradient-right">
                  <span className="inline-block">{file.name}</span>
                </div>
              ) : (
                <span className="line-clamp-2 break-words w-full leading-tight">
                  {file.name}
                </span>
              )}

              {view === "list" && (
                <div className="flex gap-1 ml-2 shrink-0">
                  {isNew && !isUploading && (
                    <span className="bg-green-500/10 text-green-500 text-[10px] px-1.5 py-0.5 rounded-full border border-green-500/20 whitespace-nowrap">
                      New
                    </span>
                  )}
                  {isShared && !isUploading && (
                    <span className="bg-blue-500/10 text-blue-500 text-[10px] px-1.5 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-0.5">
                      <LinkIcon size={8} /> Link
                    </span>
                  )}
                </div>
              )}
            </div>

            {isUploading || isError ? (
              <div className="w-full mt-2">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground mb-1">
                  <span>{isError ? "Gagal" : "Mengupload..."}</span>
                  <span>
                    {isError ? (
                      <XCircle size={10} className="text-destructive" />
                    ) : (
                      `${uploadProgress}%`
                    )}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      isError ? "bg-destructive" : "bg-primary",
                    )}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {isError && (
                  <p className="text-[10px] text-destructive mt-1 truncate">
                    {uploadError}
                  </p>
                )}
              </div>
            ) : (
              <>
                {view === "list" && !file.isFolder && !compactClass && (
                  <p className="text-xs text-muted-foreground mt-1 text-left truncate">
                    {file.size ? formatBytes(parseInt(file.size)) : "-"} •{" "}
                    {new Date(file.modifiedTime).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
                {(view === "grid" || view === "gallery") && !file.isFolder && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1 mt-1">
                      {isNew && (
                        <span className="bg-green-500/10 text-green-500 text-[9px] px-1 rounded-full border border-green-500/20">
                          New
                        </span>
                      )}
                      {isShared && (
                        <span className="bg-blue-500/10 text-blue-500 text-[9px] px-1 rounded-full border border-blue-500/20">
                          Link
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-xs text-muted-foreground mt-0.5 truncate w-full",
                        view === "grid" ? "text-center" : "text-left",
                      )}
                    >
                      {file.size ? formatBytes(parseInt(file.size)) : "-"}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {!isBulkMode && !isUploading && (
            <div
              className={cn(
                "hidden md:flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 focus-within:opacity-100 shrink-0",
                compactClass && "scale-90 origin-right",
              )}
            >
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

          {isBulkMode && !isUploading && (
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

const arePropsEqual = (prevProps: FileItemProps, nextProps: FileItemProps) => {
  return (
    prevProps.file.id === nextProps.file.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isBulkMode === nextProps.isBulkMode &&
    prevProps.density === nextProps.density &&
    prevProps.isShared === nextProps.isShared &&
    prevProps.uploadProgress === nextProps.uploadProgress &&
    prevProps.uploadStatus === nextProps.uploadStatus &&
    prevProps.file.name === nextProps.file.name &&
    prevProps.file.isFavorite === nextProps.file.isFavorite
  );
};

export default memo(FileItem, arePropsEqual);