import { motion } from "framer-motion";
import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from "@/lib/store";
import FileItem from "./FileItem";
import React from "react";
import EmptyState from "./EmptyState";
import { FolderSearch } from "lucide-react";

interface FileListProps {
  files: DriveFile[];
  onItemClick: (file: DriveFile) => void;
  onItemContextMenu: (
    event: React.MouseEvent<HTMLDivElement>,
    file: DriveFile,
  ) => void;
  activeFileId: string | null;
  onShareClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDetailsClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDownloadClick: (e: React.MouseEvent, file: DriveFile) => void;
  isAdmin: boolean;
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
}: FileListProps) {
  const { view, selectedFiles, isBulkMode } = useAppStore();
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
  const containerClass =
    view === "list"
      ? "flex flex-col gap-2"
      : "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4";
  return (
    <motion.div
      className={containerClass}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          onClick={() => onItemClick(file)}
          onContextMenu={(event: React.MouseEvent<HTMLDivElement>) =>
            onItemContextMenu(event, file)
          }
          isSelected={selectedFiles.includes(file.id)}
          isActive={!isBulkMode && activeFileId === file.id}
          isBulkMode={isBulkMode}
          onShare={(e) => onShareClick(e, file)}
          onShowDetails={(e) => onDetailsClick(e, file)}
          onDownload={(e) => onDownloadClick(e, file)}
          isAdmin={isAdmin}
        />
      ))}
    </motion.div>
  );
}