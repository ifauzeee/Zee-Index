import { useAppStore } from "@/lib/store";
import React, { useEffect, useRef, useMemo } from "react";

import ListView from "./views/ListView";
import GridView from "./views/GridView";
import GalleryView from "./views/GalleryView";
import type { BrowserFile, FileBrowserActionEvent } from "./views/types";
import type { UploadItem } from "@/lib/store";

interface FileListProps {
  files: BrowserFile[];
  onItemClick: (file: BrowserFile) => void;
  onItemContextMenu: (
    event: { clientX: number; clientY: number },
    file: BrowserFile,
  ) => void;
  activeFileId: string | null;
  focusedIndex?: number;
  onShareClick: (e: FileBrowserActionEvent, file: BrowserFile) => void;
  onDetailsClick: (e: FileBrowserActionEvent, file: BrowserFile) => void;
  onDownloadClick: (e: FileBrowserActionEvent, file: BrowserFile) => void;
  isAdmin: boolean;
  onDragStart: (e: React.DragEvent, file: BrowserFile) => void;
  onFileDrop: (e: React.DragEvent, targetFolder: BrowserFile) => void;
  onPrefetchItem?: (file: BrowserFile) => void;
  uploads?: Record<string, UploadItem>;
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

  const handleItemClickWrapper = (
    file: BrowserFile,
    e: FileBrowserActionEvent,
  ) => {
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
    e: FileBrowserActionEvent,
    file: BrowserFile,
  ) => {
    e.stopPropagation();
    toggleFavorite(file.id, true);
  };

  const uploadGhostFiles = useMemo(
    () =>
      Object.values(uploads).map(
        (upload): BrowserFile => ({
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
        }),
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
