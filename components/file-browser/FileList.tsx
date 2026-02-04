import type { DriveFile } from "@/lib/drive";
import { useAppStore } from "@/lib/store";
import React, { useEffect, useRef, useMemo } from "react";

import ListView from "./views/ListView";
import GridView from "./views/GridView";
import GalleryView from "./views/GalleryView";

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
  onPrefetchItem?: (file: DriveFile) => void;
  uploads?: Record<string, any>;
  isFetchingNextPage?: boolean;
  nextPageToken?: string | null;
  navigatingId: string | null;
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
  onPrefetchItem,
  uploads = {},
  isFetchingNextPage,
  nextPageToken,
  navigatingId,
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
  } = useAppStore();

  const lastSelectedId = useRef<string | null>(null);

  useEffect(() => {
    if (isAdmin && shareLinks.length === 0) {
      fetchShareLinks();
    }
  }, [isAdmin, shareLinks.length, fetchShareLinks]);

  const handleItemClickWrapper = (file: DriveFile, e: React.MouseEvent) => {
    if (isAdmin && e.shiftKey && lastSelectedId.current) {
      const allFileItems = [...uploadGhostFiles, ...files];
      const currentIndex = allFileItems.findIndex((f) => f.id === file.id);
      const lastIndex = allFileItems.findIndex(
        (f) => f.id === lastSelectedId.current,
      );

      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const newSelection = allFileItems.slice(start, end + 1);

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

  const commonProps = {
    files: allItems,
    onItemClick: handleItemClickWrapper,
    onItemContextMenu,
    activeFileId,
    focusedIndex,
    onShareClick,
    onDetailsClick,
    onDownloadClick,
    onToggleFavorite: handleToggleFavoriteWrapper,
    isAdmin,
    onDragStart,
    onFileDrop,
    onPrefetchItem,
    selectedFiles,
    isBulkMode,
    shareLinks,
    density,
    isFetchingNextPage,
    nextPageToken,
    navigatingId,
  };

  if (view === "grid") {
    return <GridView {...commonProps} />;
  }

  if (view === "gallery") {
    return <GalleryView {...commonProps} />;
  }

  return <ListView {...commonProps} />;
}
