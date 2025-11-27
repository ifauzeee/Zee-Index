"use client";

import React, { useRef, useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";
import FileList from "@/components/FileList";
import FileBrowserLoading from "./FileBrowserLoading";
import FolderReadme from "./FolderReadme";
import type { DriveFile } from "@/lib/googleDrive";

interface FileBrowserContentProps {
  isLoading: boolean;
  sessionStatus: string;
  shareToken: string | null;
  isLocked: boolean;
  readmeFile: DriveFile | undefined;
  sortedFiles: DriveFile[];
  activeFileId: string | null;
  isAdmin: boolean;
  uploads: any;
  
  onItemClick: (file: DriveFile) => void;
  onContextMenu: (e: any, file: DriveFile) => void;
  onShareClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDetailsClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDownloadClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDragStart: (e: React.DragEvent, file: DriveFile) => void;
  onFileDrop: (e: React.DragEvent, target: DriveFile) => void;
  onPrefetchFolder: (id: string) => void;
  
  isFetchingNextPage: boolean;
  nextPageToken: string | null;
  fetchNextPage: () => void;
}

export default function FileBrowserContent(props: FileBrowserContentProps) {
  const {
    isLoading, sessionStatus, shareToken, isLocked,
    readmeFile, sortedFiles, activeFileId, isAdmin, uploads,
    onItemClick, onContextMenu, onShareClick, onDetailsClick, onDownloadClick,
    onDragStart, onFileDrop, onPrefetchFolder,
    isFetchingNextPage, nextPageToken, fetchNextPage
  } = props;

  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { threshold: 1.0 },
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage]);

  if (isLoading || (sessionStatus === "loading" && !shareToken)) {
    return <FileBrowserLoading />;
  }

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground animate-in fade-in duration-300">
        <div className="p-6 bg-muted/30 rounded-full mb-4">
          <Lock size={48} className="opacity-50" />
        </div>
        <h3 className="text-lg font-semibold">Akses Terbatas</h3>
        <p className="text-sm mt-2">
          Silakan masukkan kredensial untuk mengakses folder ini.
        </p>
      </div>
    );
  }

  return (
    <>
      {readmeFile && <FolderReadme fileId={readmeFile.id} />}

      <FileList
        files={sortedFiles}
        activeFileId={activeFileId}
        onItemClick={onItemClick}
        onItemContextMenu={onContextMenu}
        onShareClick={onShareClick}
        onDetailsClick={onDetailsClick}
        onDownloadClick={onDownloadClick}
        isAdmin={isAdmin}
        onDragStart={onDragStart}
        onFileDrop={onFileDrop}
        onPrefetchFolder={onPrefetchFolder}
        uploads={uploads}
      />

      <div ref={loaderRef} className="flex justify-center items-center p-4 h-20">
        {isFetchingNextPage && (
          <Loader2 className="animate-spin text-primary" />
        )}
        {!isFetchingNextPage && !nextPageToken && sortedFiles.length > 0 && (
          <span className="text-sm text-muted-foreground">
            Akhir dari daftar
          </span>
        )}
      </div>
    </>
  );
}
