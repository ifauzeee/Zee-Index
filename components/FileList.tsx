import { motion } from "framer-motion";
import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from "@/lib/store";
import FileItem from "./FileItem";
import React, { useEffect } from "react";
import EmptyState from "./EmptyState";
import { FolderSearch } from "lucide-react";
import Masonry from "react-masonry-css";
import { MASONRY_BREAKPOINTS } from "@/lib/utils";

interface FileListProps {
  files: DriveFile[];
  onItemClick: (file: DriveFile) => void;
  onItemContextMenu: (
    event: { clientX: number; clientY: number },
    file: DriveFile,
  ) => void;
  activeFileId: string | null;
  onShareClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDetailsClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDownloadClick: (e: React.MouseEvent, file: DriveFile) => void;
  isAdmin: boolean;
  onDragStart: (e: React.DragEvent, file: DriveFile) => void;
  onFileDrop: (e: React.DragEvent, targetFolder: DriveFile) => void;
  onPrefetchFolder?: (folderId: string) => void;
}

export default function FileList({
  files,
  onItemClick,
  onItemContextMenu,
  activeFileId,
  onShareClick,
  onDetailsClick,
  onDownloadClick,
  isAdmin,
  onDragStart,
  onFileDrop,
  onPrefetchFolder,
}: FileListProps) {
  const {
    view,
    selectedFiles,
    isBulkMode,
    density,
    shareLinks,
    fetchShareLinks,
  } = useAppStore();

  useEffect(() => {
    if (isAdmin && shareLinks.length === 0) {
      fetchShareLinks();
    }
  }, [isAdmin, shareLinks.length, fetchShareLinks]);

  if (files.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground col-span-full">
        <EmptyState
          icon={FolderSearch}
          title="Folder ini Kosong"
          message="Unggah file atau buat folder baru untuk memulai."
        />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const renderFileItem = (file: DriveFile) => {
    const isShared = shareLinks.some(
      (link) => !link.isCollection && link.path.includes(file.id),
    );

    return (
      <FileItem
        key={file.id}
        file={file}
        onClick={() => onItemClick(file)}
        onContextMenu={(event) => onItemContextMenu(event, file)}
        isSelected={selectedFiles.some((f) => f.id === file.id)}
        isActive={!isBulkMode && activeFileId === file.id}
        isBulkMode={isBulkMode}
        onShare={(e) => onShareClick(e, file)}
        onShowDetails={(e) => onDetailsClick(e, file)}
        onDownload={(e) => onDownloadClick(e, file)}
        isAdmin={isAdmin}
        onDragStart={(e) => onDragStart(e, file)}
        onFileDrop={onFileDrop}
        onMouseEnter={() => {
          if (file.isFolder && onPrefetchFolder) {
            onPrefetchFolder(file.id);
          }
        }}
        density={density}
        isShared={isShared}
      />
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
          {files.map(renderFileItem)}
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
      {files.map(renderFileItem)}
    </motion.div>
  );
}