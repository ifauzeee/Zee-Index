import React, { useEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { FolderSearch } from "lucide-react";
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
}: FileBrowserViewProps) {
  const t = useTranslations("FileList");
  const listRef = useRef<HTMLDivElement | null>(null);
  const [numColumns, setNumColumns] = useState(2);

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
    scrollMargin: listRef.current?.offsetTop ?? 0,
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
          const startIndex = virtualRow.index * numColumns;
          const rowFiles = files.slice(startIndex, startIndex + numColumns);

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
    </div>
  );
}
