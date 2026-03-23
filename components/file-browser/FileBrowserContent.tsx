"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FileList from "@/components/file-browser/FileList";
import FileBrowserLoading from "@/components/file-browser/FileBrowserLoading";
import FolderReadme from "@/components/file-browser/FolderReadme";
import PinnedSection from "@/components/file-browser/PinnedSection";
import AuthForm from "@/components/features/AuthForm";
import { Lock } from "lucide-react";
import type { DriveFile } from "@/lib/drive";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import type { RequestError } from "@/lib/errors";
import type {
  BrowserFile,
  FileBrowserActionEvent,
} from "@/components/file-browser/views/types";
import type { UploadItem } from "@/lib/store";

interface FileBrowserContentProps {
  isLoading: boolean;
  sessionStatus: string;
  shareToken: string | null;
  isLocked: boolean;
  lockedFolderName?: string;
  lockedFolderId?: string;
  onAuthSubmit: (id: string, pass: string) => void;
  isAuthLoading: boolean;
  readmeFile: DriveFile | undefined;
  sortedFiles: BrowserFile[];
  activeFileId: string | null;
  isAdmin: boolean;
  uploads: Record<string, UploadItem>;

  onItemClick: (file: BrowserFile) => void;
  onContextMenu: (
    e: { clientX: number; clientY: number },
    file: BrowserFile,
  ) => void;
  onShareClick: (e: FileBrowserActionEvent, file: BrowserFile) => void;
  onDetailsClick: (e: FileBrowserActionEvent, file: BrowserFile) => void;
  onDownloadClick: (e: FileBrowserActionEvent, file: BrowserFile) => void;
  onDragStart: (e: React.DragEvent, file: BrowserFile) => void;
  onFileDrop: (e: React.DragEvent, target: BrowserFile) => void;
  onPrefetchItem: (file: BrowserFile) => void;

  isFetchingNextPage: boolean;
  nextPageToken: string | null;
  fetchNextPage: () => void;
  navigatingId: string | null;
  currentFolderId: string | undefined;
  error: RequestError | null;
}

import { useTranslations } from "next-intl";

export default function FileBrowserContent(props: FileBrowserContentProps) {
  const {
    isLoading,
    sessionStatus,
    shareToken,
    isLocked,
    lockedFolderName,
    lockedFolderId,
    onAuthSubmit,
    isAuthLoading,
    readmeFile,
    sortedFiles,
    activeFileId,
    isAdmin,
    uploads,
    onItemClick,
    onContextMenu,
    onShareClick,
    onDetailsClick,
    onDownloadClick,
    onDragStart,
    onFileDrop,
    onPrefetchItem,
    isFetchingNextPage,
    nextPageToken,
    fetchNextPage,
    navigatingId,
    currentFolderId,
    error,
  } = props;

  const t = useTranslations("FileBrowser");
  const tList = useTranslations("FileList");

  const { focusedIndex } = useKeyboardNavigation({
    files: sortedFiles as Array<{ id: string; name: string; mimeType: string }>,
    onFileOpen: (file) => onItemClick(file as BrowserFile),
  });

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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] w-full animate-in fade-in duration-500">
        <AuthForm
          folderId={lockedFolderId}
          folderName={lockedFolderName || t("lockedFolder")}
          isLoading={isAuthLoading}
          onSubmit={onAuthSubmit}
        />
      </div>
    );
  }

  if (error && !isLocked && !error.isProtected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground w-full gap-4">
        <div className="p-4 bg-destructive/10 rounded-full text-destructive">
          <Lock className="w-8 h-8" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            {error.status === 401
              ? t("lockedFolder")
              : tList("errorTitle") || "Error"}
          </h3>
          <p className="text-sm max-w-md mt-1">
            {error.message ||
              tList("errorMessage") ||
              "Gagal mengambil data file."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <PinnedSection />
      </div>

      {readmeFile && (
        <div className="mb-6">
          <FolderReadme fileId={readmeFile.id} />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentFolderId || "root"}
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.02, y: -15 }}
          transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
        >
          <FileList
            files={sortedFiles}
            activeFileId={activeFileId}
            focusedIndex={focusedIndex}
            onItemClick={onItemClick}
            onItemContextMenu={onContextMenu}
            onShareClick={onShareClick}
            onDetailsClick={onDetailsClick}
            onDownloadClick={onDownloadClick}
            isAdmin={isAdmin}
            onDragStart={onDragStart}
            onFileDrop={onFileDrop}
            onPrefetchItem={onPrefetchItem}
            uploads={uploads}
            isFetchingNextPage={isFetchingNextPage}
            nextPageToken={nextPageToken}
            navigatingId={navigatingId}
          />
        </motion.div>
      </AnimatePresence>
    </>
  );
}
