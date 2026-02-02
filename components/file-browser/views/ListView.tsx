import React, { useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { FolderSearch } from "lucide-react";
import { useTranslations } from "next-intl";

import FileItem from "../FileItem";
import EmptyState from "../EmptyState";
import { FileBrowserViewProps } from "./types";

export default function ListView({
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
  const listRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useWindowVirtualizer({
    count: files.length,
    estimateSize: () => (density === "compact" ? 40 : 68),
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

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
    <div ref={listRef} className="relative w-full">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const file = files[virtualRow.index];
          if (!file) return null;

          const isShared =
            !(file as any).uploadStatus &&
            shareLinks.some(
              (link) => !link.isCollection && link.path.includes(file.id),
            );

          const isFocused = virtualRow.index === focusedIndex;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                data-file-index={virtualRow.index}
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
      </div>
    </div>
  );
}
