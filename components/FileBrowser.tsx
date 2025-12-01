"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from "@/lib/store";
import { useSession } from "next-auth/react";
import { getFileType } from "@/lib/utils";
import { useFileActions } from "@/hooks/useFileActions";
import { useFileFetching } from "@/hooks/useFileFetching";
import { useUpload } from "@/hooks/useUpload";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useGallery } from "@/hooks/useGallery";
import { useQueryClient } from "@tanstack/react-query";

import FileBrowserHeader from "./FileBrowserHeader";
import ImageGallery from "./ImageGallery";
import FileBrowserModals from "./FileBrowserModals";
import FileBrowserContent from "./FileBrowserContent";

export default function FileBrowser({
  initialFolderId,
  initialFolderPath,
}: {
  initialFolderId?: string;
  initialFolderPath?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const queryClient = useQueryClient();

  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    folderId: string;
    folderName: string;
  }>({ isOpen: false, folderId: "", folderName: "" });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isFileRequestModalOpen, setIsFileRequestModalOpen] = useState(false);
  const [imageEditorFile, setImageEditorFile] = useState<DriveFile | null>(
    null,
  );
  const [showHistory, setShowHistory] = useState(false);

  const {
    sort,
    setSort,
    isBulkMode,
    setBulkMode,
    toggleSelection,
    view,
    setView,
    refreshKey,
    addToast,
    folderTokens,
    setFolderToken,
    user,
    fetchUser,
    shareToken,
    setShareToken,
    favorites,
    fetchFavorites,
    detailsFile,
    setDetailsFile,
    setCurrentFolderId,
    playAudio,
  } = useAppStore();

  const {
    files,
    history,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    nextPageToken,
    currentFolderId,
    authModalInfo,
  } = useFileFetching({
    initialFolderId,
    initialFolderPath,
    shareToken,
    folderTokens,
    addToast,
    router,
    refreshKey,
  });

  useEffect(() => {
    if (currentFolderId) setCurrentFolderId(currentFolderId);
  }, [currentFolderId, setCurrentFolderId]);

  const isGuest = user?.isGuest === true;
  const isAdmin = user?.role === "ADMIN" && !isGuest;

  const {
    uploads,
    isUploadModalOpen,
    droppedFiles,
    isDragging,
    setIsUploadModalOpen,
    handleDragOver,
    handleDragLeave,
    handleDropUpload,
    handleFileSelect,
  } = useUpload({
    currentFolderId,
    isAdmin,
    triggerRefresh: useAppStore.getState().triggerRefresh,
  });

  const {
    dragOverBreadcrumb,
    handleDragStart,
    onDropOnFolder,
    onDropOnBreadcrumb,
    handleBreadcrumbDragOver,
    handleBreadcrumbDragLeave,
  } = useDragAndDrop({
    isAdmin,
    isBulkMode,
    selectedFiles: useAppStore.getState().selectedFiles,
    currentFolderId,
    triggerRefresh: useAppStore.getState().triggerRefresh,
    clearSelection: useAppStore.getState().clearSelection,
    addToast,
  });

  const {
    contextMenu,
    setContextMenu,
    actionState,
    setActionState,
    previewFile,
    setPreviewFile,
    archivePreview,
    setArchivePreview,
    handleArchivePreview,
    handleContextMenu,
    getSharePath,
    handleShare,
    handleToggleFavorite,
    handleCopy,
    handleRename,
    handleDelete,
    handleMove,
    handleTogglePin,
    isFilePinned,
  } = useFileActions(currentFolderId);

  const gallery = useGallery(files);

  const readmeFile = useMemo(() => {
    return files.find(
      (f) => f.name.toLowerCase() === "readme.md" && !f.trashed,
    );
  }, [files]);

  const sortedFiles = useMemo(() => {
    return [...files]
      .map((file) => ({ ...file, isFavorite: favorites.includes(file.id) }))
      .sort((a, b) => {
        const isAsc = sort.order === "asc" ? 1 : -1;
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        if (sort.key === "name")
          return a.name.localeCompare(b.name, "id", { numeric: true }) * isAsc;
        if (sort.key === "size")
          return (Number(a.size || 0) - Number(b.size || 0)) * isAsc;
        return (
          (new Date(a.modifiedTime).getTime() -
            new Date(b.modifiedTime).getTime()) *
          isAsc
        );
      });
  }, [files, sort, favorites]);

  useEffect(() => {
    if (sessionStatus === "authenticated" && !user) {
      fetchUser();
      fetchFavorites();
    }
  }, [sessionStatus, user, fetchUser, fetchFavorites]);

  useEffect(() => {
    const currentShareToken = searchParams.get("share_token");
    setShareToken(currentShareToken || null);
  }, [searchParams, setShareToken]);

  useEffect(() => {
    if (authModalInfo) {
      setAuthModal({
        isOpen: true,
        folderId: authModalInfo.folderId,
        folderName: authModalInfo.folderName,
      });
    }
  }, [authModalInfo]);

  const handleAuthSubmit = async (id: string, password: string) => {
    setIsAuthLoading(true);
    try {
      const response = await fetch("/api/auth/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: authModal.folderId, id, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kredensial salah.");
      setFolderToken(authModal.folderId, data.token);
      addToast({ message: "Akses diberikan!", type: "success" });
      setAuthModal({ isOpen: false, folderId: "", folderName: "" });
      router.push(`/folder/${authModal.folderId}`);
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const createSlug = (name: string) =>
    encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());

  const handleItemClick = (file: DriveFile) => {
    if (isBulkMode) {
      toggleSelection(file);
      return;
    }
    if (getFileType(file) === "audio") {
      playAudio(file);
      return;
    }
    if (gallery.openGallery(file.id)) {
      return;
    }
    let destinationUrl = "";
    if (file.isFolder) {
      if (file.isProtected && !folderTokens[file.id]) {
        setAuthModal({
          isOpen: true,
          folderId: file.id,
          folderName: file.name,
        });
        return;
      }
      destinationUrl = `/folder/${file.id}`;
    } else {
      destinationUrl = `/folder/${currentFolderId}/file/${file.id}/${createSlug(file.name)}`;
    }
    if (shareToken) {
      destinationUrl += `?share_token=${shareToken}`;
    }
    router.push(destinationUrl);
  };

  const handlePrefetchFolder = useCallback(
    (folderId: string) => {
      const fetchUrl = new URL(window.location.origin + "/api/files");
      fetchUrl.searchParams.append("folderId", folderId);
      if (shareToken) fetchUrl.searchParams.append("share_token", shareToken);

      queryClient.prefetchInfiniteQuery({
        queryKey: [
          "files",
          folderId,
          shareToken,
          folderTokens[folderId],
          refreshKey,
        ],
        queryFn: async () => {
          const headers = new Headers();
          if (folderTokens[folderId]) {
            headers.append("Authorization", `Bearer ${folderTokens[folderId]}`);
          }
          const res = await fetch(fetchUrl.toString(), { headers });
          if (!res.ok) throw new Error("Failed to prefetch");
          return res.json();
        },
        initialPageParam: null as string | null,
      });
    },
    [queryClient, shareToken, folderTokens, refreshKey],
  );

  const handleContextMenuWrapper = useCallback(
    (event: any, file: DriveFile) => {
      if (isBulkMode || shareToken || !isAdmin) return;
      if (!user) return;
      setActiveFileId(file.id);
      handleContextMenu(event, file);
    },
    [isBulkMode, shareToken, user, isAdmin, handleContextMenu],
  );

  const handleQuickShare = (e: React.MouseEvent, file: DriveFile) => {
    e.stopPropagation();
    if (user?.role !== "ADMIN") return;
    handleShare(file);
  };

  const handleQuickDownload = (e: React.MouseEvent, file: DriveFile) => {
    e.stopPropagation();
    window.open(
      `/api/download?fileId=${file.id}${shareToken ? `&share_token=${shareToken}` : ""}`,
      "_blank",
    );
  };

  const handleBreadcrumbClick = (folderId: string) => {
    if (shareToken && folderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID)
      return;
    let folderUrl =
      folderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID
        ? "/"
        : `/folder/${folderId}`;
    if (shareToken) folderUrl += `?share_token=${shareToken}`;
    router.push(folderUrl);
  };

  return (
    <motion.div
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropUpload}
    >
      <FileBrowserHeader
        history={history}
        shareToken={shareToken}
        isAdmin={isAdmin}
        isBulkMode={isBulkMode}
        view={view}
        dragOverBreadcrumb={dragOverBreadcrumb}
        activeFileId={activeFileId}
        onBreadcrumbClick={handleBreadcrumbClick}
        onBreadcrumbDragOver={handleBreadcrumbDragOver}
        onBreadcrumbDragLeave={handleBreadcrumbDragLeave}
        onBreadcrumbDrop={(e, folder) => onDropOnBreadcrumb(e, folder)}
        onUploadClick={() => setIsUploadModalOpen(true)}
        onShareFolderClick={() =>
          handleShare({
            id: currentFolderId,
            name: history[history.length - 1]?.name || "Folder",
            isFolder: true,
            mimeType: "application/vnd.google-apps.folder",
            modifiedTime: "",
            createdTime: "",
            hasThumbnail: false,
            webViewLink: "",
            trashed: false,
          })
        }
        onRequestFileClick={() => setIsFileRequestModalOpen(true)}
        onToggleBulkMode={() => setBulkMode(!isBulkMode)}
        onSetView={setView}
        onDetailsClick={() => {
          const file = files.find((f) => f.id === activeFileId);
          if (file) setDetailsFile(file);
        }}
        sort={sort}
        onSortChange={setSort}
      />

      <main className="min-h-[50vh] mb-12">
        <FileBrowserContent
          isLoading={isLoading}
          sessionStatus={sessionStatus}
          shareToken={shareToken}
          isLocked={authModal.isOpen || authModalInfo !== null}
          readmeFile={readmeFile}
          sortedFiles={sortedFiles}
          activeFileId={activeFileId}
          isAdmin={isAdmin}
          uploads={uploads}
          onItemClick={handleItemClick}
          onContextMenu={handleContextMenuWrapper}
          onShareClick={handleQuickShare}
          onDetailsClick={(e, file) => {
            e.stopPropagation();
            setDetailsFile(file);
          }}
          onDownloadClick={handleQuickDownload}
          onDragStart={handleDragStart}
          onFileDrop={onDropOnFolder}
          onPrefetchFolder={handlePrefetchFolder}
          isFetchingNextPage={isFetchingNextPage}
          nextPageToken={nextPageToken}
          fetchNextPage={fetchNextPage}
        />
      </main>

      <FileBrowserModals
        authModal={authModal}
        isAuthLoading={isAuthLoading}
        onCloseAuth={() =>
          setAuthModal({ isOpen: false, folderId: "", folderName: "" })
        }
        onAuthSubmit={handleAuthSubmit}
        isFileRequestModalOpen={isFileRequestModalOpen}
        setIsFileRequestModalOpen={setIsFileRequestModalOpen}
        currentFolderId={currentFolderId}
        folderName={history[history.length - 1]?.name || "Folder"}
        imageEditorFile={imageEditorFile}
        setImageEditorFile={setImageEditorFile}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        actionState={actionState}
        setActionState={setActionState}
        handleRename={handleRename}
        handleDelete={handleDelete}
        handleShare={handleShare}
        handleMove={handleMove}
        handleToggleFavorite={handleToggleFavorite}
        handleCopy={handleCopy}
        handleArchivePreview={handleArchivePreview}
        previewFile={previewFile}
        setPreviewFile={setPreviewFile}
        archivePreview={archivePreview}
        setArchivePreview={setArchivePreview}
        detailsFile={detailsFile}
        setDetailsFile={setDetailsFile}
        isUploadModalOpen={isUploadModalOpen}
        setIsUploadModalOpen={setIsUploadModalOpen}
        droppedFiles={droppedFiles}
        handleFileSelect={handleFileSelect}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleDropUpload={handleDropUpload}
        isDragging={isDragging}
        isAdmin={isAdmin}
        getSharePath={getSharePath}
        favorites={favorites}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        handleTogglePin={handleTogglePin}
        isFilePinned={isFilePinned}
      />

      <ImageGallery
        isOpen={gallery.isOpen}
        initialIndex={gallery.startIndex}
        images={gallery.imageFiles}
        onClose={gallery.closeGallery}
      />
    </motion.div>
  );
}
