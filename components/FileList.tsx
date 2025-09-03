// components/FileList.tsx
import { motion } from 'framer-motion';
import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from '@/lib/store';
import FileItem from "./FileItem";
import React from 'react';

interface FileListProps {
  files: DriveFile[];
  onItemClick: (file: DriveFile) => void;
  // Tambahkan props baru untuk context menu
  onItemContextMenu: (event: React.MouseEvent<HTMLDivElement>, file: DriveFile) => void;
}

export default function FileList({ files, onItemClick, onItemContextMenu }: FileListProps) {
  const { view, selectedFiles, isBulkMode } = useAppStore();

  if (files.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground col-span-full">
        <i className="fas fa-box-open text-6xl"></i>
        <p className="mt-4">Folder ini kosong.</p>
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

  const containerClass = view === 'list' 
    ? 'flex flex-col gap-2' 
    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4';

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
          // Beri tipe data yang benar pada event handler
          onContextMenu={(event: React.MouseEvent<HTMLDivElement>) => onItemContextMenu(event, file)}
          isSelected={selectedFiles.includes(file.id)}
          isBulkMode={isBulkMode}
        />
      ))}
    </motion.div>
  );
}