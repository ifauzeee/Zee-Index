"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from "@/lib/store";
import FileBrowserLoading from "./FileBrowserLoading";
import FileList from "@/components/FileList";
import AuthModal from "./AuthModal";
import {
  List,
  Grid,
  CheckSquare,
  Share2,
  Upload,
  Loader2,
  X,
  Info,
  UploadCloud,
  File as FileIcon,
} from "lucide-react";
import ContextMenu from "./ContextMenu";
import RenameModal from "./RenameModal";
import DeleteConfirm from "./DeleteConfirm";
import UploadModal from "./UploadModal";
import MoveModal from "./MoveModal";
import ShareButton from "./ShareButton";
import { useSession } from "next-auth/react";
import FileDetail from "./FileDetail";
import DetailsPanel from "./DetailsPanel";
import { cn, getFileType, formatBytes } from "@/lib/utils";
import { useFileActions } from "@/hooks/useFileActions";
import ArchivePreviewModal from "./ArchivePreviewModal";
import { useFileFetching } from "@/hooks/useFileFetching";
import { useUpload } from "@/hooks/useUpload";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { jwtDecode } from "jwt-decode";
import ImageGallery from "./ImageGallery";

interface HistoryItem {
  id: string;
  name: string;
}

const ARCHIVE_PREVIEW_LIMIT_BYTES = 100 * 1024 * 1024;
export default function FileBrowser({
  initialFolderId,
}: {
  initialFolderId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();

  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    folderId: string;
    folderName: string;
  }>({ isOpen: false, folderId: "", folderName: "" });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  const {
    sort,
    isBulkMode,
    setBulkMode,
    toggleSelection,
    selectedFiles,
    clearSelection,
    view,
    setView,
    refreshKey,
    addToast,
    triggerRefresh,
    folderTokens,
    setFolderToken,
    user,
    fetchUser,
    shareToken,
    setShareToken,
    setCurrentFolderId,
    favorites,
    fetchFavorites,
    detailsFile,
    setDetailsFile,
  } = useAppStore();

  const {
    files,
    history,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    nextPageToken,
    refetchFiles,
    currentFolderId,
    authModalInfo,
  } = useFileFetching({
    initialFolderId,
    shareToken,
    folderTokens,
    addToast,
    router,
    refreshKey,
  });

  const imageFiles = useMemo(() => {
    return files.filter((f) => getFileType(f) === "image");
  }, [files]);
  const isGuest = user?.isGuest === true;
  const isAdmin = user?.role === "ADMIN" && !isGuest;
  const {
    uploads,
    isUploadModalOpen,
    droppedFiles,
    isDragging,
    handleFileUpload,
    setIsUploadModalOpen,
    setDroppedFiles,
    handleDragOver,
    handleDragLeave,
    handleDropUpload,
  } = useUpload({
    currentFolderId,
    isAdmin,
    triggerRefresh,
  });
  const {
    isDropMoving,
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
    triggerRefresh,
    clearSelection,
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
          addToast({
            message: "Tautan berbagi ini tidak valid atau telah dicabut.",
            type: "error",
          });
          router.push("/login?error=ShareLinkRevoked");
        }
      } catch (e) {
        addToast({
          message: "Gagal memvalidasi tautan berbagi.",
          type: "error",
        });
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

      try {
        const decodedToken: { exp: number } = jwtDecode(currentShareToken);
        const expirationTime = decodedToken.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiration = expirationTime - currentTime;

        if (timeUntilExpiration > 0) {
          const timer = setTimeout(() => {
            addToast({
              message: "Sesi berbagi Anda telah berakhir.",
              type: "info",
            });
            router.push("/login?error=InvalidOrExpiredShareLink");
          }, timeUntilExpiration);

          return () => clearTimeout(timer);
        } else {
          addToast({
            message: "Tautan berbagi ini telah kedaluwarsa.",
            type: "error",
          });
          router.push("/login?error=InvalidOrExpiredShareLink");
        }
      } catch (error) {
        console.error("Token tidak valid:", error);
        addToast({
          message: "Tautan berbagi tidak valid.",
          type: "error",
        });
        router.push("/login?error=InvalidOrExpiredShareLink");
      }
    } else {
      setShareToken(null);
    }
  }, [searchParams, setShareToken, addToast, router, validateShareToken]);


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

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeFileId, files, previewFile, detailsFile, setPreviewFile]);
  useEffect(() => {
    const isOverlayActive =
      contextMenu || detailsFile || previewFile || archivePreview;

    if (isOverlayActive) {
      document.body.classList.add("mobile-menu-open");
    } else {
      document.body.classList.remove("mobile-menu-open");
    }

    return () => {
      document.body.classList.remove("mobile-menu-open");
    };
  }, [contextMenu, detailsFile, previewFile, archivePreview]);

  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) observer.disconnect();
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
  useEffect(() => {
    if (sessionStatus === "loading" && !shareToken) {
      return;
    }
    if (sessionStatus === "unauthenticated" && !shareToken) {
      router.push("/login?callbackUrl=" + window.location.pathname);
      return;
    }
  }, [sessionStatus, shareToken, router]);

  const handleItemClick = (file: DriveFile) => {
    if (isBulkMode) {
      toggleSelection(file);
      return;
    }

    const type = getFileType(file);
    if (type === "image") {
      const index = imageFiles.findIndex((img) => img.id === file.id);
      if (index !== -1) {
        setGalleryStartIndex(index);
        setIsGalleryOpen(true);
        return;
      }
    }

    if (file.isFolder) {
      if (file.isProtected && !folderTokens[file.id]) {
        setAuthModal({
          isOpen: true,
          folderId: file.id,
          folderName: file.name,
        });
        return;
      }
      let destinationUrl = `/folder/${file.id}`;
      if (shareToken) {
        destinationUrl += `?share_token=${shareToken}`;
      }
      setActiveFileId(null);
      router.push(destinationUrl);
      return;
    }

    if (activeFileId === file.id) {
      let destinationUrl = `/folder/${currentFolderId}/file/${
        file.id
      }/${createSlug(file.name)}`;
      if (shareToken) {
        destinationUrl += `?share_token=${shareToken}`;
      }
      setActiveFileId(null);
      router.push(destinationUrl);
    } else {
      setActiveFileId(file.id);
    }
  };
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

      const targetFolderId = authModal.folderId;
      setAuthModal({ isOpen: false, folderId: "", folderName: "" });
      router.push(`/folder/${targetFolderId}`);
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsAuthLoading(false);
    }
  };
  const handleBreadcrumbClick = (folderId: string) => {
    if (shareToken && folderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID) {
      addToast({
        message: "Akses dibatasi hanya untuk folder yang dibagikan.",
        type: "info",
      });
      return;
    }

    let folderUrl =
      folderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID
        ? "/"
        : `/folder/${folderId}`;
    if (shareToken) {
      folderUrl += `?share_token=${shareToken}`;
    }
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
        switch (sort.key) {
          case "name":
            return (
              a.name.localeCompare(b.name, "id", { numeric: true }) * isAsc
            );
          case "size":
            return (Number(a.size || 0) - Number(b.size || 0)) * isAsc;
          case "modifiedTime":
            return (
              (new Date(a.modifiedTime).getTime() -
                new Date(b.modifiedTime).getTime()) *
              isAsc
            );
          default:
            return 0;
        }
      });
  }, [files, sort, favorites]);
  const handleQuickShare = (e: React.MouseEvent, file: DriveFile) => {
    e.stopPropagation();
    if (user?.role !== "ADMIN") {
      addToast({ message: "Fitur berbagi hanya untuk Admin.", type: "error" });
      return;
    }
    handleShare(file);
  };

  const handleQuickDetails = (e: React.MouseEvent, file: DriveFile) => {
    e.stopPropagation();
    setDetailsFile(file);
  };

  const handleQuickDownload = (e: React.MouseEvent, file: DriveFile) => {
    e.stopPropagation();
    const downloadUrl = `/api/download?fileId=${file.id}${
      shareToken ? `&share_token=${shareToken}` : ""
    }`;
    window.open(downloadUrl, "_blank");
  };

  if (isLoading || (sessionStatus === "loading" && !shareToken)) {
    return <FileBrowserLoading />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
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
        {contextMenu && (() => {
          const fileType = getFileType(contextMenu.file);
          const fileSize = parseInt(contextMenu.file.size || "0", 10);
          const isArchive = fileType === "archive";
          const isArchivePreviewable =
            isArchive && fileSize <= ARCHIVE_PREVIEW_LIMIT_BYTES;

          return (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
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
                if (!contextMenu.file.isFolder) {
                  setPreviewFile(contextMenu.file);
                } else {
                  addToast({
                    message: "Pratinjau cepat tidak tersedia untuk folder.",
                    type: "info",
                  });
                }
                setContextMenu(null);
              }}
              isArchive={isArchive}
              isArchivePreviewable={isArchivePreviewable}
              fileSize={fileSize}
              onArchivePreview={handleArchivePreview}
            />
          );
        })()}
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
            onClose={() => {
              setIsUploadModalOpen(false);
              setDroppedFiles(null);
            }}
            initialFiles={droppedFiles}
          />
        )}
        {previewFile && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              className="relative w-full h-full max-w-6xl max-h-[90vh] bg-background rounded-lg shadow-xl overflow-hidden"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
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
                File akan ditambahkan ke folder &quot;{history.at(-1)?.name}
                &quot;
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex justify-between items-center py-4 overflow-x-hidden">
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap">
          {history.map((folder, index) => (
            <span key={folder.id} className="flex items-center">
              <button
                onClick={() => handleBreadcrumbClick(folder.id)}
                onDragOver={(e) => handleBreadcrumbDragOver(e, folder.id)}
                onDragLeave={handleBreadcrumbDragLeave}
                onDrop={(e) => onDropOnBreadcrumb(e, folder)}
                className={cn(
                  "transition-colors rounded-md p-1",
                  shareToken && index === 0
                    ? "cursor-default text-muted-foreground"
                    : "hover:text-primary hover:bg-accent",
                  dragOverBreadcrumb === folder.id &&
                    "bg-primary/20 text-primary",
                )}
              >
                {folder.name}
              </button>
              {index < history.length - 1 && <span className="mx-2">/</span>}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {!shareToken && isAdmin && (
            <>
              <button
                onClick={() => {
                  setIsUploadModalOpen(true);
                  setDroppedFiles(null);
                }}
                className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-sm gap-2 text-foreground"
                title="Upload atau Buat Folder"
              >
                <Upload size={18} />
              </button>
              <button
                onClick={() => {
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
                  });
                }}
                className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-sm gap-2 text-foreground"
                title="Bagikan Folder Ini"
              >
                <Share2 size={18} />
              </button>
              <button
                onClick={() => {
                  const file = files.find((f) => f.id === activeFileId);
                  if (file) setDetailsFile(file);
                }}
                disabled={!activeFileId}
                className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-sm gap-2 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                title="Lihat Detail"
              >
                <Info size={18} />
              </button>
              <button
                onClick={() => setBulkMode(!isBulkMode)}
                className={`p-2 rounded-lg transition-colors flex items-center justify-center text-sm ${
                  isBulkMode
                    ? "bg-blue-600 text-white"
                    : "bg-transparent hover:bg-accent text-foreground"
                }`}
                title="Pilih Beberapa File"
              >
                <CheckSquare size={18} />
                <span className="sr-only">Pilih</span>
              </button>
            </>
          )}
          <div className="flex items-center border border-border rounded-lg p-0.5">
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-md transition-colors ${
                view === "list"
                  ? "bg-background text-primary shadow-sm"
                  : "hover:bg-accent/50 text-muted-foreground"
              }`}
              title="Tampilan Daftar"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                view === "grid"
                  ? "bg-background text-primary shadow-sm"
                  : "hover:bg-accent/50 text-muted-foreground"
              }`}
              title="Tampilan Grid"
            >
              <Grid size={18} />
            </button>
          </div>
        </div>
      </div>
      <main className="min-h-[50vh] mb-12">
        {isLoading ? (
          <FileBrowserLoading />
        ) : (
          <>
            <FileList
              files={sortedFiles}
              activeFileId={activeFileId}
              onItemClick={handleItemClick}
              onItemContextMenu={handleContextMenuWrapper}
              onShareClick={handleQuickShare}
              onDetailsClick={handleQuickDetails}
              onDownloadClick={handleQuickDownload}
              isAdmin={isAdmin}
              onDragStart={handleDragStart}
              onFileDrop={onDropOnFolder}
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

      {Object.keys(uploads).length > 0 && (
        <div className="fixed bottom-6 right-6 z-[9990] w-80 space-y-3">
          {Object.values(uploads).map((up) => (
            <motion.div
              layout
              key={up.name}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="p-4 rounded-lg shadow-lg bg-card border"
            >
              <div className="flex justify-between items-center text-sm mb-1">
                <p className="truncate font-medium flex items-center gap-2">
                  <FileIcon size={14} />
                  <span className="max-w-[150px] truncate">{up.name}</span>
                </p>
                <span
                  className={cn(
                    "text-xs font-mono",
                    up.status === "error" && "text-red-500",
                    up.status === "success" && "text-green-500",
                  )}
                >
                  {up.status === "uploading" && `${up.progress.toFixed(0)}%`}
                  {up.status === "success" && `Selesai`}
                  {up.status === "error" && `Gagal`}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    up.status === "error" ? "bg-red-500" : "bg-primary",
                  )}
                  style={{ width: `${up.progress}%` }}
                ></div>
              </div>
              {up.status === "error" && (
                <p className="text-xs text-red-500 mt-1">{up.error}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
      <ImageGallery
        isOpen={isGalleryOpen}
        initialIndex={galleryStartIndex}
        images={imageFiles}
        onClose={() => setIsGalleryOpen(false)}
      />
    </motion.div>
  );
}