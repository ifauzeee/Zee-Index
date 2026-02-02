import React from "react";
import { motion } from "framer-motion";
import Masonry from "react-masonry-css";
import { FolderSearch } from "lucide-react";
import { useTranslations } from "next-intl";

import { MASONRY_BREAKPOINTS } from "@/lib/utils";
import FileItem from "../FileItem";
import EmptyState from "../EmptyState";
import { FileBrowserViewProps } from "./types";

export default function GalleryView({
  files,
  onItemClick,
  onItemContextMenu,
  activeFileId,
  focusedIndex = -1,
  onShareClick,
  onDetailsClick,
  onDownloadClick,
  isAdmin,
  onDragStart,
  onFileDrop,
  onPrefetchItem,
  onToggleFavorite,
  selectedFiles,
  isBulkMode,
  shareLinks,
  density,
}: FileBrowserViewProps) {
  const t = useTranslations("FileList");

  if (files.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground col-span-full">
        <EmptyState
          icon={FolderSearch}
          title={t("emptyTitle")}
          message={t("emptyMessage")}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Masonry
        breakpointCols={MASONRY_BREAKPOINTS}
        className="flex w-auto -ml-4"
        columnClassName="pl-4 bg-clip-padding"
      >
        {files.map((file, index) => {
          const isShared =
            !(file as any).uploadStatus &&
            shareLinks.some(
              (link) => !link.isCollection && link.path.includes(file.id),
            );
          const isFocused = index === focusedIndex;

          return (
            <div key={file.id} className="mb-4">
              <div
                data-file-index={index}
                onClick={(e) =>
                  !(file as any).uploadStatus && onItemClick(file, e)
                }
                className={
                  isFocused
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg pb-2"
                    : "pb-2"
                }
              >
                <FileItem
                  file={file}
                  onClick={() => {}}
                  onContextMenu={(event) => onItemContextMenu(event, file)}
                  isSelected={selectedFiles.some((f) => f.id === file.id)}
                  isActive={!isBulkMode && activeFileId === file.id}
                  isBulkMode={isBulkMode}
                  onShare={(e) => onShareClick(e, file)}
                  onShowDetails={(e) => onDetailsClick(e, file)}
                  onDownload={(e) => onDownloadClick(e, file)}
                  onToggleFavorite={(e) => onToggleFavorite?.(e, file)}
                  isAdmin={isAdmin}
                  onDragStart={(e) => onDragStart(e, file)}
                  onFileDrop={onFileDrop}
                  onMouseEnter={() => {
                    if (onPrefetchItem && !(file as any).uploadStatus) {
                      onPrefetchItem(file);
                    }
                  }}
                  density={density}
                  isShared={isShared}
                  uploadProgress={(file as any).uploadProgress}
                  uploadStatus={(file as any).uploadStatus}
                  uploadError={(file as any).uploadError}
                />
              </div>
            </div>
          );
        })}
      </Masonry>
    </motion.div>
  );
}
