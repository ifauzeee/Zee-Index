import React, { useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { FolderSearch, Loader2 } from "lucide-react";
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
  isFetchingNextPage,
  nextPageToken,
  navigatingId,
}: FileBrowserViewProps) {
  const t = useTranslations("FileList");
  const listRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = React.useState(0);

  React.useLayoutEffect(() => {
    const updateOffset = () => {
      if (listRef.current) {
        const rect = listRef.current.getBoundingClientRect();
        setOffset(rect.top + window.scrollY);
      }
    };

    updateOffset();

    const observer = new ResizeObserver(updateOffset);
    if (listRef.current?.parentElement) {
      observer.observe(listRef.current.parentElement);
    }

    window.addEventListener("resize", updateOffset);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOffset);
    };
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: files.length,
    estimateSize: () => (density === "compact" ? 40 : 68),
    overscan: 5,
    scrollMargin: offset,
  });

  if (files.length === 0 && !isFetchingNextPage) {
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
          minHeight: files.length > 0 ? "100px" : "0px",
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
              data-index={virtualRow.index.toString()}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start - offset}px)`,
              }}
            >
              <div
                data-file-index={virtualRow.index}
                onClick={(e) => {
                  if (!(file as any).uploadStatus) {
                    onItemClick(file, e);
                  }
                }}
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
                  isNavigating={navigatingId === file.id}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center items-center p-8 mt-4 mb-16">
        {isFetchingNextPage ? (
          <Loader2 className="animate-spin text-primary" />
        ) : !nextPageToken && files.length > 0 ? (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t("endOfList")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
