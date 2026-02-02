import React, { useEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { FolderSearch, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import FileCard from "../FileCard";
import EmptyState from "../EmptyState";
import { FileBrowserViewProps } from "./types";
import { DriveFile } from "@/lib/drive";

export default function GridView({
  files,
  onItemClick,
  onItemContextMenu,
  focusedIndex = -1,
  onShareClick,
  onDetailsClick,
  onDownloadClick,
  onPrefetchItem,
  isFetchingNextPage,
  nextPageToken,
}: FileBrowserViewProps) {
  const t = useTranslations("FileList");
  const listRef = useRef<HTMLDivElement | null>(null);
  const [numColumns, setNumColumns] = useState(2);
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

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1280) setNumColumns(6);
      else if (width >= 1024) setNumColumns(5);
      else if (width >= 768) setNumColumns(4);
      else if (width >= 640) setNumColumns(3);
      else setNumColumns(2);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const rowCount = Math.ceil(files.length / numColumns);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 220,
    overscan: 5,
    scrollMargin: offset,
  });

  const getThumbnailSrc = (file: DriveFile) => {
    if (file.thumbnailLink) {
      return file.thumbnailLink.replace(/=s\d+/, `=s320`);
    }
    return undefined;
  };

  const handleNavigate = (folderId: string) => {
    const folder = files.find((f) => f.id === folderId);
    if (folder) {
      const mockEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        shiftKey: false,
      } as React.MouseEvent;
      onItemClick(folder, mockEvent);
    }
  };

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
          minHeight: files.length > 0 ? "200px" : "0px",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * numColumns;
          const rowFiles = files.slice(startIndex, startIndex + numColumns);

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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 pb-3 sm:pb-4">
                {rowFiles.map((file, colIndex) => {
                  const absoluteIndex = startIndex + colIndex;
                  const isFocused = absoluteIndex === focusedIndex;

                  return (
                    <div
                      key={file.id}
                      data-file-index={absoluteIndex}
                      className={
                        isFocused
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg h-full"
                          : "h-full"
                      }
                    >
                      <FileCard
                        file={file}
                        onNavigate={handleNavigate}
                        onClick={(f) => {
                          const mockEvent = {
                            preventDefault: () => {},
                            stopPropagation: () => {},
                            shiftKey: false,
                          } as React.MouseEvent;
                          onItemClick(f, mockEvent);
                        }}
                        onContextMenu={onItemContextMenu}
                        onShare={onShareClick}
                        onDetails={onDetailsClick}
                        onDownload={onDownloadClick}
                        thumbnailSrc={getThumbnailSrc(file)}
                        onMouseEnter={() => {
                          if (onPrefetchItem && !(file as any).uploadStatus) {
                            onPrefetchItem(file);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Akhir daftar / Loader di luar virtualisasi absolute */}
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
