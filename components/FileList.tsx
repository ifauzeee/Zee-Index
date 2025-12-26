import { motion } from "framer-motion";
import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from "@/lib/store";
import FileItem from "./FileItem";
import FileCard from "./FileBrowser/FileCard";
import React, { useEffect, useRef } from "react";
import EmptyState from "./EmptyState";
import { FolderSearch } from "lucide-react";
import Masonry from "react-masonry-css";
import { MASONRY_BREAKPOINTS } from "@/lib/utils";
import { useTranslations } from "next-intl";

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

  useEffect(() => {
    if (isAdmin && shareLinks.length === 0) {
      fetchShareLinks();
    }
  }, [isAdmin, shareLinks.length, fetchShareLinks]);

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

  const uploadGhostFiles = Object.values(uploads).map(
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
  );

  const allItems = [...uploadGhostFiles, ...files];

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0,
      },
    },
  };

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

  const renderFileItem = (
    file: DriveFile & {
      uploadProgress?: number;
      uploadStatus?: string;
      uploadError?: string;
    },
    index: number,
  ) => {
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
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg"
              : ""
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
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg"
            : ""
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
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Masonry
          breakpointCols={MASONRY_BREAKPOINTS}
          className="flex w-auto -ml-4"
          columnClassName="pl-4 bg-clip-padding"
        >
          {allItems.map(renderFileItem)}
        </Masonry>
      </motion.div>
    );
  }

  const containerClass =
    view === "list"
      ? "flex flex-col gap-2"
      : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4";

  return (
    <motion.div
      className={containerClass}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {allItems.map(renderFileItem)}
    </motion.div>
  );
}
