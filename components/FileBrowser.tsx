"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from "@/lib/store";
import FileBrowserLoading from "./FileBrowserLoading";
import FileList from "@/components/FileList";
import AuthModal from "./AuthModal";
import { Loader2, X, UploadCloud, Lock } from "lucide-react";
import ContextMenu from "./ContextMenu";
import RenameModal from "./RenameModal";
import DeleteConfirm from "./DeleteConfirm";
import UploadModal from "./UploadModal";
import MoveModal from "./MoveModal";
import ShareButton from "./ShareButton";
import { useSession } from "next-auth/react";
import FileDetail from "./FileDetail";
import { getFileType } from "@/lib/utils";
import { useFileActions } from "@/hooks/useFileActions";
import ArchivePreviewModal from "./ArchivePreviewModal";
import { useFileFetching } from "@/hooks/useFileFetching";
import { useUpload } from "@/hooks/useUpload";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import ImageGallery from "./ImageGallery";
import FileBrowserHeader from "./FileBrowserHeader";
import FileBrowserUploadProgress from "./FileBrowserUploadProgress";
import { useGallery } from "@/hooks/useGallery";
import FileRequestModal from "./FileRequestModal";
import FolderReadme from "./FolderReadme";
import ImageEditorModal from "./ImageEditorModal";
import { useQueryClient } from "@tanstack/react-query";

const ARCHIVE_PREVIEW_LIMIT_BYTES = 100 * 1024 * 1024;

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

  const {
    sort,
    isBulkMode,
    setBulkMode,
    toggleSelection,
    selectedFiles,
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
    if (currentFolderId) {
      setCurrentFolderId(currentFolderId);
    }
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
    selectedFiles,
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
  } = useFileActions(currentFolderId);

  const gallery = useGallery(files);

  const readmeFile = useMemo(() => {
    return files.find(
      (f) => f.name.toLowerCase() === "readme.md" && !f.trashed,
    );
  }, [files]);

  useEffect(() => {
    if (sessionStatus === "authenticated" && !user) {
      fetchUser();
      fetchFavorites();
    }
  }, [sessionStatus, user, fetchUser, fetchFavorites]);

  const validateShareToken = useCallback(
    async (token: string) => {
      try {
        const res = await fetch("/api/share/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shareToken: token }),
        });
        const data = await res.json();
        if (!data.valid) {
          addToast({ message: "Tautan berbagi tidak valid.", type: "error" });
          router.push("/login?error=ShareLinkRevoked");
        }
      } catch {
        router.push("/login?error=InvalidOrExpiredShareLink");
      }
    },
    [addToast, router],
  );

  useEffect(() => {
    const currentShareToken = searchParams.get("share_token");
    if (currentShareToken) {
      setShareToken(currentShareToken);
      validateShareToken(currentShareToken);
    } else {
      setShareToken(null);
    }
  }, [searchParams, setShareToken, validateShareToken]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && activeFileId && !previewFile && !detailsFile) {
        e.preventDefault();
        const fileToPreview = files.find((f) => f.id === activeFileId);
        if (fileToPreview && !fileToPreview.isFolder) {
          setPreviewFile(fileToPreview);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFileId, files, previewFile, detailsFile, setPreviewFile]);

  const loaderRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { threshold: 1.0 },
    );
    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);
    return () => {
      if (currentLoader) observer.disconnect();
    };
  }, [fetchNextPage]);

  useEffect(() => {
    if (authModalInfo) {
      setAuthModal({
        isOpen: true,
        folderId: authModalInfo.folderId,
        folderName: authModalInfo.folderName,
      });
    }
  }, [authModalInfo]);

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      addToast({ message: message, type: "error" });
    } finally {
      setIsAuthLoading(false);
    }
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

  const handleContextMenuWrapper = useCallback(
    (event: { clientX: number; clientY: number }, file: DriveFile) => {
      if (isBulkMode || shareToken || !isAdmin) return;
      if (!user) return;
      setActiveFileId(file.id);
      handleContextMenu(event, file);
    },
    [isBulkMode, shareToken, user, isAdmin, handleContextMenu],
  );

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

  const isLockedAndNoAccess = authModal.isOpen || (authModalInfo !== null);

  if (isLoading || (sessionStatus === "loading" && !shareToken))
    return <FileBrowserLoading />;

  return (
    <motion.div
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropUpload}
    >
      <AnimatePresence>
        {authModal.isOpen && (
          <AuthModal
            folderName={authModal.folderName}
            isLoading={isAuthLoading}
            onClose={() =>
              setAuthModal({ isOpen: false, folderId: "", folderName: "" })
            }
            onSubmit={handleAuthSubmit}
          />
        )}
        {isFileRequestModalOpen && (
          <FileRequestModal
            folderId={currentFolderId}
            folderName={history[history.length - 1]?.name || "Folder"}
            onClose={() => setIsFileRequestModalOpen(false)}
          />
        )}
        {imageEditorFile && (
          <ImageEditorModal
            file={imageEditorFile}
            onClose={() => setImageEditorFile(null)}
          />
        )}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            fileSize={parseInt(contextMenu.file.size || "0", 10)}
            isImage={getFileType(contextMenu.file) === "image"}
            onEditImage={() => {
              setImageEditorFile(contextMenu.file);
              setContextMenu(null);
            }}
            onRename={() => {
              setActionState({ type: "rename", file: contextMenu.file });
              setContextMenu(null);
            }}
            onDelete={() => {
              setActionState({ type: "delete", file: contextMenu.file });
              setContextMenu(null);
            }}
            onShare={() => {
              handleShare(contextMenu.file);
              setContextMenu(null);
            }}
            onMove={() => {
              setActionState({ type: "move", file: contextMenu.file });
              setContextMenu(null);
            }}
            isFavorite={favorites.includes(contextMenu.file.id)}
            onToggleFavorite={handleToggleFavorite}
            onCopy={handleCopy}
            onShowDetails={() => {
              setDetailsFile(contextMenu.file);
              setContextMenu(null);
            }}
            onPreview={() => {
              if (!contextMenu.file.isFolder) setPreviewFile(contextMenu.file);
              else
                addToast({
                  message: "Tidak tersedia untuk folder.",
                  type: "info",
                });
              setContextMenu(null);
            }}
            isArchive={getFileType(contextMenu.file) === "archive"}
            isArchivePreviewable={
              getFileType(contextMenu.file) === "archive" &&
              parseInt(contextMenu.file.size || "0", 10) <=
                ARCHIVE_PREVIEW_LIMIT_BYTES
            }
            onArchivePreview={handleArchivePreview}
          />
        )}
        {actionState.type === "rename" && actionState.file && (
          <RenameModal
            currentName={actionState.file.name}
            onClose={() => setActionState({ type: null, file: null })}
            onRename={handleRename}
          />
        )}
        {actionState.type === "delete" && actionState.file && (
          <DeleteConfirm
            itemName={actionState.file.name}
            onClose={() => setActionState({ type: null, file: null })}
            onConfirm={handleDelete}
          />
        )}
        {actionState.type === "share" && actionState.file && (
          <ShareButton
            path={getSharePath(actionState.file)}
            itemName={actionState.file.name}
            isOpen={true}
            onClose={() => setActionState({ type: null, file: null })}
          />
        )}
        {actionState.type === "move" && actionState.file && (
          <MoveModal
            fileToMove={actionState.file}
            onClose={() => setActionState({ type: null, file: null })}
            onConfirmMove={handleMove}
          />
        )}
        {isUploadModalOpen && (
          <UploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            initialFiles={droppedFiles}
            handleFileSelect={handleFileSelect}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDropUpload={handleDropUpload}
            isDragging={isDragging}
          />
        )}
        {previewFile && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              className="relative w-full h-full max-w-6xl max-h-[90vh] bg-background rounded-lg shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewFile(null)}
                className="absolute top-3 right-3 z-50 p-2 bg-background/50 rounded-full text-foreground hover:bg-background"
              >
                <X size={24} />
              </button>
              <FileDetail file={previewFile} isModal={true} />
            </motion.div>
          </motion.div>
        )}
        {archivePreview && (
          <ArchivePreviewModal
            file={archivePreview}
            onClose={() => setArchivePreview(null)}
          />
        )}
        {isDragging && isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/30 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center justify-center p-12 bg-background rounded-lg shadow-2xl ring-4 ring-primary ring-dashed">
              <UploadCloud className="h-24 w-24 text-primary" />
              <p className="mt-4 text-2xl font-semibold text-foreground">
                Lepas untuk Mengunggah
              </p>
              <p className="text-muted-foreground">
                Ke folder &quot;{history.at(-1)?.name}&quot;
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
      />

      <main className="min-h-[50vh] mb-12">
        {isLockedAndNoAccess ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground animate-in fade-in duration-300">
            <div className="p-6 bg-muted/30 rounded-full mb-4">
              <Lock size={48} className="opacity-50" />
            </div>
            <h3 className="text-lg font-semibold">Akses Terbatas</h3>
            <p className="text-sm mt-2">
              Silakan masukkan kredensial untuk mengakses folder ini.
            </p>
          </div>
        ) : (
          <>
            {readmeFile && <FolderReadme fileId={readmeFile.id} />}

            <FileList
              files={sortedFiles}
              activeFileId={activeFileId}
              onItemClick={handleItemClick}
              onItemContextMenu={handleContextMenuWrapper}
              onShareClick={handleQuickShare}
              onDetailsClick={(e, file) => {
                e.stopPropagation();
                setDetailsFile(file);
              }}
              onDownloadClick={handleQuickDownload}
              isAdmin={isAdmin}
              onDragStart={handleDragStart}
              onFileDrop={onDropOnFolder}
              onPrefetchFolder={handlePrefetchFolder}
            />
            <div
              ref={loaderRef}
              className="flex justify-center items-center p-4 h-20"
            >
              {isFetchingNextPage && (
                <Loader2 className="animate-spin text-primary" />
              )}
              {!isFetchingNextPage && !nextPageToken && files.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Akhir dari daftar
                </span>
              )}
            </div>
          </>
        )}
      </main>

      <FileBrowserUploadProgress uploads={uploads} />

      <ImageGallery
        isOpen={gallery.isOpen}
        initialIndex={gallery.startIndex}
        images={gallery.imageFiles}
        onClose={gallery.closeGallery}
      />
    </motion.div>
  );
}