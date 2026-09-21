import type { DriveFile } from "@/lib/drive";
import { useAppStore } from "@/lib/store";
import { formatBytes, getIcon, cn, extractExcerpt } from "@/lib/utils";
import React, { useState, useMemo, memo, useEffect, useRef } from "react";
import { motion, Variants } from "framer-motion";
import { Star, Lock } from "lucide-react";
import { useFormatter } from "next-intl";
import type {
  BrowserFile,
  FileBrowserActionEvent,
} from "@/components/file-browser/views/types";
import FileItemThumbnail from "@/components/file-browser/FileItemThumbnail";
import FileItemActions from "@/components/file-browser/FileItemActions";

interface FileItemProps {
  file: BrowserFile;
  onClick: (e: FileBrowserActionEvent) => void;
  onContextMenu: (
    event: { clientX: number; clientY: number },
    file: DriveFile,
  ) => void;
  isSelected: boolean;
  isActive: boolean;
  isBulkMode: boolean;
  onShare: (e: FileBrowserActionEvent) => void;
  onShowDetails: (e: FileBrowserActionEvent) => void;
  onDownload: (e: FileBrowserActionEvent) => void;
  onToggleFavorite?: (e: FileBrowserActionEvent, file: DriveFile) => void;
  isAdmin: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onFileDrop: (e: React.DragEvent, targetFolder: DriveFile) => void;
  onMouseEnter?: () => void;
  density?: "comfortable" | "compact";
  isShared?: boolean;
  uploadProgress?: number;
  uploadStatus?: "uploading" | "error" | "success";
  uploadError?: string;
  isNavigating?: boolean;
  onPrefetchItem?: (file: DriveFile) => void;
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
  uploadProgress,
  uploadStatus,
  isNavigating,
  onPrefetchItem,
}: FileItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onPrefetchItem || uploadStatus || !file.isFolder) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onPrefetchItem(file);
        }
      },
      { rootMargin: "200px" },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [file, uploadStatus, onPrefetchItem]);
  const { view, toggleSelection } = useAppStore();
  const Icon = getIcon(file.mimeType);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const format = useFormatter();

  useEffect(() => {
    const checkMatch = () => {
      setIsDesktop(window.matchMedia("(pointer: fine)").matches);
    };
    checkMatch();
    window.addEventListener("resize", checkMatch);
    return () => window.removeEventListener("resize", checkMatch);
  }, []);

  const thumbnailSrc = useMemo(() => {
    if (file.thumbnailLink) {
      let size = "s800";
      if (view === "list") size = "s64";
      else if (view === "gallery") size = "s1280";

      return file.thumbnailLink.replace(/=s\d+/, `=${size}`);
    }
    return undefined;
  }, [file.thumbnailLink, view]);

  const handleContextMenuEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu({ clientX: e.clientX, clientY: e.clientY }, file);
  };

  const createActionEvent = (
    event: React.MouseEvent,
  ): FileBrowserActionEvent => ({
    preventDefault: () => event.preventDefault(),
    stopPropagation: () => event.stopPropagation(),
    shiftKey: event.shiftKey,
  });

  const preventSelection = (e: React.MouseEvent) => {
    if (e.detail > 1) {
      e.preventDefault();
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2, ease: "easeOut" },
    },
    hover: {
      scale: 1.02,
      y: -2,
      transition: { duration: 0.2, ease: "easeInOut" },
    },
    tap: { scale: 0.98, transition: { duration: 0.1 } },
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
  const hasImage = !!thumbnailSrc && !file.isFolder && !imageError;

  const compactClass = density === "compact" && view === "list";
  const isUploading = uploadStatus === "uploading";
  const isError = uploadStatus === "error";

  const canDrag = isAdmin && !isUploading && isDesktop;

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover={!isUploading && isDesktop ? "hover" : undefined}
      whileTap={!isUploading ? "tap" : undefined}
      className={cn(
        isGallery && "mb-4",
        isUploading && "opacity-80",
        "w-full max-w-full will-change-transform",
      )}
      onMouseEnter={onMouseEnter}
      ref={containerRef}
    >
      <div
        className={cn(
          "group relative rounded-lg transition-all duration-200 ease-in-out cursor-pointer overflow-hidden w-full border",
          "select-none touch-pan-y touch-action-manipulation",
          isSelected
            ? "bg-primary/10 border-primary shadow-sm"
            : "bg-card border-border hover:shadow-lg hover:border-primary/30",
          isActive && !isBulkMode && "ring-1 ring-primary",
          view === "list"
            ? compactClass
              ? "p-1.5 min-h-[40px]"
              : "p-3 min-h-[68px]"
            : "w-full",
          isGallery && "p-0 border-none",
          isDragOver &&
            "ring-4 ring-primary/30 bg-primary/20 scale-[1.05] z-50 shadow-2xl border-primary",
          isError && "ring-2 ring-destructive/50 bg-destructive/5",
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
        onClick={(e) => {
          if (isUploading) return;

          const target = e.target as HTMLElement;
          if (target.closest("button") || target.closest("input")) return;

          onClick(createActionEvent(e));
        }}
        onMouseDown={preventSelection}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onContextMenu={!isUploading ? handleContextMenuEvent : undefined}
        draggable={canDrag}
        onDragStart={onDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
      >
        <div
          className={cn(
            "flex w-full min-w-0 pointer-events-none",
            view === "list" ? "items-center gap-3" : "flex-col",
          )}
        >
          <div
            className={cn(
              "relative shrink-0 pointer-events-auto",
              isGallery && "w-full min-h-[150px]",
            )}
          >
            <FileItemThumbnail
              file={file}
              isGallery={isGallery}
              thumbnailSrc={thumbnailSrc}
              hasImage={hasImage}
              isImageLoading={isImageLoading}
              setImageLoading={setIsImageLoading}
              setImageError={setImageError}
              isNavigating={isNavigating}
              compactClass={compactClass}
              Icon={Icon}
            />

            {view !== "list" && file.isProtected && !isGallery && (
              <div className="absolute -bottom-1 -right-1 flex items-center justify-center p-1.5 bg-background/60 rounded-full ring-2 ring-background/20 z-20">
                <Lock size={12} className="text-primary" />
              </div>
            )}
          </div>

          <div className={cn("flex-1 min-w-0 max-w-full", isGallery && "p-3")}>
            <div
              className={cn(
                "font-medium flex items-center gap-1.5 min-w-0",
                view === "list" ? "text-sm justify-start" : "text-sm",
              )}
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

              {view === "list" ? (
                <div
                  className={cn(
                    "flex-1 min-w-0 overflow-hidden",
                    isBulkMode && "pr-10",
                  )}
                >
                  <p
                    className="truncate block select-none"
                    onMouseDown={preventSelection}
                  >
                    {file.name}
                  </p>
                </div>
              ) : (
                <p
                  className="line-clamp-2 break-words w-full leading-tight select-none"
                  onMouseDown={preventSelection}
                >
                  {file.name}
                </p>
              )}
            </div>

            {view === "list" &&
              !file.isFolder &&
              !compactClass &&
              !isUploading && (
                <p
                  className="text-xs text-muted-foreground mt-1 text-left truncate select-none"
                  onMouseDown={preventSelection}
                >
                  {file.size ? formatBytes(parseInt(file.size)) : "-"} •{" "}
                  {file.modifiedTime
                    ? format.dateTime(new Date(file.modifiedTime), {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </p>
              )}

            {view === "list" && file.contentText && !compactClass && (
              <p
                className="text-xs text-muted-foreground/70 mt-1 text-left line-clamp-2 select-none italic leading-relaxed"
                onMouseDown={preventSelection}
              >
                {extractExcerpt(file.contentText, 200)}
              </p>
            )}

            {(isUploading || isError) && (
              <div className="w-full mt-2">
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full",
                      isError ? "bg-red-500" : "bg-primary",
                    )}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <FileItemActions
            file={file}
            view={view}
            isAdmin={isAdmin}
            isBulkMode={isBulkMode}
            uploadStatus={uploadStatus}
            compactClass={compactClass}
            onShare={onShare}
            onDownload={onDownload}
            onToggleFavorite={onToggleFavorite}
            onShowDetails={onShowDetails}
            onContextMenu={onContextMenu}
            isSelected={isSelected}
            toggleSelection={toggleSelection}
          />
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
    prevProps.file.isFavorite === nextProps.file.isFavorite &&
    prevProps.isAdmin === nextProps.isAdmin
  );
};

export default memo(FileItem, arePropsEqual);
