import { motion } from "framer-motion";
import type { DriveFile } from "@/lib/drive";
import { useAppStore } from "@/lib/store";
import FileItem from "@/components/file-browser/FileItem";
import FileCard from "@/components/file-browser/FileCard";
import React, { useEffect, useRef, useState, useMemo } from "react";
import EmptyState from "@/components/file-browser/EmptyState";
import { FolderSearch } from "lucide-react";
import Masonry from "react-masonry-css";
import { MASONRY_BREAKPOINTS } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

interface FileListProps {
  files: DriveFile[];
  onItemClick: (file: DriveFile) => void;
  onItemContextMenu: (
    event: { clientX: number; clientY: number },
    file: DriveFile,
  ) => void;
  activeFileId: string | null;
  focusedIndex?: number;
  onShareClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDetailsClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDownloadClick: (e: React.MouseEvent, file: DriveFile) => void;
  isAdmin: boolean;
  onDragStart: (e: React.DragEvent, file: DriveFile) => void;
  onFileDrop: (e: React.DragEvent, targetFolder: DriveFile) => void;
  onPrefetchFolder?: (folderId: string) => void;
  uploads?: Record<string, any>;
}

export default function FileList({
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
  onPrefetchFolder,
  uploads = {},
}: FileListProps) {
  const {
    view,
    selectedFiles,
    isBulkMode,
    density,
    shareLinks,
    fetchShareLinks,
    setSelectedFiles,
    setBulkMode,
    toggleFavorite,
    shareToken,
    folderTokens,
  } = useAppStore();
  const t = useTranslations("FileList");

  const lastSelectedId = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Column calculation state
  const [numColumns, setNumColumns] = useState(1);

  useEffect(() => {
    if (isAdmin && shareLinks.length === 0) {
      fetchShareLinks();
    }
  }, [isAdmin, shareLinks.length, fetchShareLinks]);

  // Handle responsive columns for Grid View
  useEffect(() => {
    if (view === "list") {
      setNumColumns(1);
      return;
    }

    if (view === "gallery") return; // Handled by Masonry

    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1280)
        setNumColumns(6); // xl
      else if (width >= 1024)
        setNumColumns(5); // lg
      else if (width >= 768)
        setNumColumns(4); // md
      else if (width >= 640)
        setNumColumns(3); // sm
      else setNumColumns(2); // default
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, [view]);

  const handleItemClickWrapper = (file: DriveFile, e: React.MouseEvent) => {
    if (isAdmin && e.shiftKey && lastSelectedId.current) {
      const currentIndex = files.findIndex((f) => f.id === file.id);
      const lastIndex = files.findIndex((f) => f.id === lastSelectedId.current);

      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const newSelection = files.slice(start, end + 1);

        if (!isBulkMode) setBulkMode(true);

        const combinedSelection = [...selectedFiles];
        newSelection.forEach((f) => {
          if (!combinedSelection.find((s) => s.id === f.id)) {
            combinedSelection.push(f);
          }
        });

        setSelectedFiles(combinedSelection);
        return;
      }
    }

    lastSelectedId.current = file.id;
    onItemClick(file);
  };

  const handleToggleFavoriteWrapper = (
    e: React.MouseEvent,
    file: DriveFile,
  ) => {
    e.stopPropagation();
    toggleFavorite(file.id, true);
  };

  const uploadGhostFiles = useMemo(
    () =>
      Object.values(uploads).map(
        (upload: any) =>
          ({
            id: `upload-${upload.name}`,
            name: upload.name,
            mimeType: "application/octet-stream",
            size: "0",
            modifiedTime: new Date().toISOString(),
            createdTime: new Date().toISOString(),
            webViewLink: "",
            hasThumbnail: false,
            isFolder: false,
            trashed: false,
            uploadProgress: upload.progress,
            uploadStatus: upload.status,
            uploadError: upload.error,
          }) as any,
      ),
    [uploads],
  );

  const allItems = useMemo(
    () => [...uploadGhostFiles, ...files],
    [uploadGhostFiles, files],
  );

  const rowCount = Math.ceil(allItems.length / numColumns);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => (view === "list" ? 64 : 220), // Estimate heights
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  if (allItems.length === 0) {
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

  const getThumbnailSrc = (file: DriveFile) => {
    if (file.thumbnailLink) {
      const size =
        view === "grid" ? "s320" : view === "gallery" ? "s1280" : "s64";
      return file.thumbnailLink.replace(/=s\d+/, `=${size}`);
    }
    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) {
      url += `&share_token=${shareToken}`;
    }
    const parentId = file.parents?.[0];
    if (parentId && folderTokens[parentId]) {
      url += `&access_token=${folderTokens[parentId]}`;
    }
    return url;
  };

  const handleNavigate = (folderId: string) => {
    const folder = files.find((f) => f.id === folderId);
    if (folder) {
      onItemClick(folder);
    }
  };

  const renderItemContent = (file: any, index: number) => {
    const isShared =
      !file.uploadStatus &&
      shareLinks.some(
        (link) => !link.isCollection && link.path.includes(file.id),
      );
    const isFocused = index === focusedIndex;

    if (view === "grid") {
      return (
        <div
          key={file.id}
          data-file-index={index}
          className={
            isFocused
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg h-full"
              : "h-full"
          }
        >
          <FileCard
            file={file}
            onNavigate={handleNavigate}
            onClick={onItemClick}
            onContextMenu={onItemContextMenu}
            onShare={onShareClick}
            onDetails={onDetailsClick}
            onDownload={onDownloadClick}
            thumbnailSrc={getThumbnailSrc(file)}
            onMouseEnter={() => {
              if (file.isFolder && onPrefetchFolder && !file.uploadStatus) {
                onPrefetchFolder(file.id);
              }
            }}
          />
        </div>
      );
    }

    return (
      <div
        key={file.id}
        data-file-index={index}
        onClick={(e) => !file.uploadStatus && handleItemClickWrapper(file, e)}
        className={
          isFocused
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg mb-2"
            : "mb-2"
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
          onToggleFavorite={(e) => handleToggleFavoriteWrapper(e, file)}
          isAdmin={isAdmin}
          onDragStart={(e) => onDragStart(e, file)}
          onFileDrop={onFileDrop}
          onMouseEnter={() => {
            if (file.isFolder && onPrefetchFolder && !file.uploadStatus) {
              onPrefetchFolder(file.id);
            }
          }}
          density={density}
          isShared={isShared}
          uploadProgress={file.uploadProgress}
          uploadStatus={file.uploadStatus as any}
          uploadError={file.uploadError}
        />
      </div>
    );
  };

  if (view === "gallery") {
    // Gallery View remains un-virtualized for now (Masonry complexity)
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
          {allItems.map((file, index) => (
            <div key={file.id} className="mb-4">
              {renderItemContent(file, index)}
            </div>
          ))}
        </Masonry>
      </motion.div>
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
          const rowFiles = allItems.slice(startIndex, startIndex + numColumns);

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
                className={
                  view === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
                    : "flex flex-col gap-0" // Gap is handled inside renderItemContent for list
                }
              >
                {rowFiles.map((file, colIndex) => (
                  <React.Fragment key={file.id}>
                    {renderItemContent(file, startIndex + colIndex)}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
