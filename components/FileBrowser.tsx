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
import { cn } from "@/lib/utils";

interface HistoryItem {
  id: string;
  name: string;
}

type ActionState = {
  type: "rename" | "delete" | "share" | "move" | "copy" | null;
  file: DriveFile | null;
};

interface UploadProgress {
  name: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

export default function FileBrowser({
  initialFolderId,
}: {
  initialFolderId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    folderId: string;
    folderName: string;
  }>({ isOpen: false, folderId: "", folderName: "" });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: DriveFile;
  } | null>(null);
  const [actionState, setActionState] = useState<ActionState>({
    type: null,
    file: null,
  });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<FileList | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [detailsFile, setDetailsFile] = useState<DriveFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});

  const {
    sort,
    isBulkMode,
    setBulkMode,
    toggleSelection,
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
    toggleFavorite,
  } = useAppStore();

  useEffect(() => {
    if (sessionStatus === "authenticated" && !user) {
      fetchUser();
      fetchFavorites();
    }
  }, [sessionStatus, user, fetchUser, fetchFavorites]);

  useEffect(() => {
    const currentShareToken = searchParams.get("share_token");
    if (currentShareToken) {
      setShareToken(currentShareToken);
    }
  }, [searchParams, setShareToken]);

  const currentFolderId =
    history.length > 0
      ? history[history.length - 1]?.id
      : initialFolderId || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;

  useEffect(() => {
    setCurrentFolderId(currentFolderId);
  }, [currentFolderId, setCurrentFolderId]);

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
  }, [activeFileId, files, previewFile, detailsFile]);

  useEffect(() => {
    const isOverlayActive = contextMenu || detailsFile || previewFile;

    if (isOverlayActive) {
      document.body.classList.add("mobile-menu-open");
    } else {
      document.body.classList.remove("mobile-menu-open");
    }

    return () => {
      document.body.classList.remove("mobile-menu-open");
    };
  }, [contextMenu, detailsFile, previewFile]);

  const isGuest = user?.isGuest === true;
  const isAdmin = user?.role === "ADMIN" && !isGuest;

  const createSlug = (name: string) =>
    encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());

  const handleFetchError = useCallback(
    async (
      response: Response,
      defaultMessage: string,
      folderId: string,
      folderName: string,
    ) => {
      const errorData = await response.json();
      if (response.status === 401) {
        if (errorData.protected) {
          setAuthModal({ isOpen: true, folderId, folderName });
        } else {
          addToast({
            message: "Sesi Anda telah berakhir. Silakan login kembali.",
            type: "error",
          });
          if (!shareToken) {
            router.push("/login?error=SessionExpired");
          }
        }
      } else {
        addToast({ message: errorData.error || defaultMessage, type: "error" });
      }
      setIsLoading(false);
    },
    [addToast, router, shareToken],
  );

  const fetchFiles = useCallback(
    async (folderId: string, folderName: string) => {
      setIsLoading(true);
      setFiles([]);
      setNextPageToken(null);
      setActiveFileId(null);
      try {
        const url = new URL(window.location.origin + "/api/files");
        url.searchParams.append("folderId", folderId);
        if (shareToken) {
          url.searchParams.append("share_token", shareToken);
        }

        const headers = new Headers();
        const folderAuthToken = folderTokens[folderId];
        if (folderAuthToken) {
          headers.append("Authorization", `Bearer ${folderAuthToken}`);
        }

        const response = await fetch(url.toString(), {
          headers,
          credentials: "include",
        });

        if (!response.ok) {
          await handleFetchError(
            response,
            "Gagal mengambil data file.",
            folderId,
            folderName,
          );
          return;
        }
        const data = await response.json();
        setFiles(data.files || []);
        setNextPageToken(data.nextPageToken || null);
      } catch (error) {
        addToast({ message: "Terjadi kesalahan jaringan.", type: "error" });
      } finally {
        setIsLoading(false);
      }
    },
    [folderTokens, handleFetchError, addToast, shareToken],
  );

  const fetchNextPage = useCallback(async () => {
    if (isFetchingNextPage || !nextPageToken || !currentFolderId) return;

    setIsFetchingNextPage(true);
    try {
      const url = new URL(window.location.origin + "/api/files");
      url.searchParams.append("folderId", currentFolderId);
      url.searchParams.append("pageToken", nextPageToken);
      if (shareToken) {
        url.searchParams.append("share_token", shareToken);
      }
      const headers = new Headers();
      const folderAuthToken = folderTokens[currentFolderId];
      if (folderAuthToken) {
        headers.append("Authorization", `Bearer ${folderAuthToken}`);
      }

      const response = await fetch(url.toString(), {
        headers,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Gagal memuat item berikutnya.");
      }
      const data = await response.json();
      setFiles((prevFiles) => [...prevFiles, ...(data.files || [])]);
      setNextPageToken(data.nextPageToken || null);
    } catch (error: any) {
      addToast({ message: error.message, type: "error" });
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [
    isFetchingNextPage,
    nextPageToken,
    currentFolderId,
    shareToken,
    folderTokens,
    addToast,
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 },
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [fetchNextPage]);

  useEffect(() => {
    if (sessionStatus === "loading" && !shareToken) {
      setIsLoading(true);
      return;
    }
    if (sessionStatus === "unauthenticated" && !shareToken) {
      router.push("/login?callbackUrl=" + window.location.pathname);
      return;
    }

    const rootFolder = {
      id: process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!,
      name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || "Beranda",
    };
    const folderToLoad = initialFolderId || rootFolder.id;

    const currentFolder =
      history.length > 0 ? history[history.length - 1] : null;
    if (!currentFolder || currentFolder.id !== folderToLoad) {
      if (folderToLoad === rootFolder.id) {
        setHistory([rootFolder]);
      } else {
        const fetchPath = async () => {
          try {
            const url = new URL(`/api/folderpath`, window.location.origin);
            url.searchParams.set("folderId", folderToLoad);
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error("Gagal memuat path folder.");
            const path = await response.json();
            setHistory([rootFolder, ...path]);
          } catch (error) {
            addToast({
              message: "Gagal memuat path, kembali ke Beranda.",
              type: "error",
            });
            router.push("/");
          }
        };
        fetchPath();
      }
    }
  }, [initialFolderId, sessionStatus, shareToken, router, addToast, history]);

  useEffect(() => {
    const currentFolder = history[history.length - 1];
    if (currentFolder) {
      fetchFiles(currentFolder.id, currentFolder.name);
    }
  }, [refreshKey, history, fetchFiles]);

  const handleItemClick = (file: DriveFile) => {
    if (isBulkMode) {
      toggleSelection(file.id);
      return;
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

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, file: DriveFile) => {
      event.preventDefault();
      if (isBulkMode || shareToken || !isAdmin) return;
      if (!user) return;
      setActiveFileId(file.id);
      setContextMenu({ x: event.clientX, y: event.clientY, file });
    },
    [isBulkMode, shareToken, user, isAdmin],
  );

  const handleShare = (file: DriveFile | null) => {
    if (user?.role !== "ADMIN") {
      addToast({ message: "Fitur berbagi hanya untuk Admin.", type: "error" });
      return;
    }
    setActionState({ type: "share", file });
  };

  const handleToggleFavorite = () => {
    if (!contextMenu?.file) return;
    const { file } = contextMenu;
    const isCurrentlyFavorite = favorites.includes(file.id);
    toggleFavorite(file.id, isCurrentlyFavorite);
    setContextMenu(null);
  };

  const handleCopy = async () => {
    if (!contextMenu?.file) {
      setContextMenu(null);
      return;
    }
    const fileToCopy = contextMenu.file;
    setContextMenu(null);
    addToast({ message: `Menyalin "${fileToCopy.name}"...`, type: "info" });
    try {
      const response = await fetch("/api/files/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: fileToCopy.id }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal membuat salinan.");
      addToast({ message: "File berhasil disalin!", type: "success" });
      triggerRefresh();
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    }
  };

  const handleRename = async (newName: string) => {
    if (!actionState.file || newName === actionState.file.name) {
      setActionState({ type: null, file: null });
      return;
    }
    try {
      const response = await fetch("/api/files/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: actionState.file.id, newName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengubah nama");
      setFiles((prevFiles: DriveFile[]) =>
        prevFiles.map((f: DriveFile) =>
          f.id === data.file.id ? { ...f, name: data.file.name } : f,
        ),
      );
      addToast({ message: "Nama berhasil diubah!", type: "success" });
      setActionState({ type: null, file: null });
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    }
  };

  const handleDelete = async () => {
    if (!actionState.file) return;

    const fileToDelete = actionState.file;
    const originalFiles = files;

    setFiles((prevFiles) =>
      prevFiles.filter((f) => f.id !== fileToDelete.id),
    );
    setActionState({ type: null, file: null });

    try {
      const response = await fetch("/api/files/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: fileToDelete.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus file");
      addToast({ message: "File berhasil dihapus!", type: "success" });
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
      setFiles(originalFiles);
    }
  };

  const handleMove = async (newParentId: string) => {
    if (!actionState.file || !actionState.file.parents) {
      setActionState({ type: null, file: null });
      return;
    }
    const currentParentId = actionState.file.parents[0];
    try {
      const response = await fetch("/api/files/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: actionState.file.id,
          currentParentId,
          newParentId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memindahkan file");
      setFiles((prevFiles: DriveFile[]) =>
        prevFiles.filter((f: DriveFile) => f.id !== actionState.file?.id),
      );
      addToast({ message: "File berhasil dipindahkan!", type: "success" });
      setActionState({ type: null, file: null });
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    }
  };

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

  const getSharePath = (file: DriveFile) => {
    if (file.isFolder) return `/folder/${file.id}`;
    return `/folder/${currentFolderId}/file/${file.id}/${createSlug(file.name)}`;
  };

  const updateUploadProgress = (
    fileName: string,
    progress: number,
    status: "uploading" | "success" | "error",
    error?: string,
  ) => {
    setUploads((prev) => ({
      ...prev,
      [fileName]: { name: fileName, progress, status, error },
    }));

    if (status === "success" || status === "error") {
      setTimeout(() => {
        setUploads((prev) => {
          const newUploads = { ...prev };
          delete newUploads[fileName];
          return newUploads;
        });
      }, 5000);
    }
  };

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !currentFolderId || !isAdmin) return;

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("parentId", currentFolderId);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/files/upload", true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            updateUploadProgress(file.name, percentComplete, "uploading");
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            updateUploadProgress(file.name, 100, "success");
            triggerRefresh();
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              updateUploadProgress(
                file.name,
                0,
                "error",
                errorResponse.error || "Upload gagal",
              );
            } catch {
              updateUploadProgress(
                file.name,
                0,
                "error",
                "Terjadi kesalahan server",
              );
            }
          }
        };
        xhr.onerror = () => {
          updateUploadProgress(
            file.name,
            0,
            "error",
            "Kesalahan jaringan saat mengunggah",
          );
        };

        updateUploadProgress(file.name, 0, "uploading");
        xhr.send(formData);
      }
    },
    [currentFolderId, triggerRefresh, isAdmin],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isAdmin) {
        setIsDragging(true);
      }
    },
    [isAdmin],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (
        isAdmin &&
        e.dataTransfer.files &&
        e.dataTransfer.files.length > 0
      ) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [isAdmin, handleFileUpload],
  );

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
      onDrop={handleDrop}
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
        {contextMenu && (
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
        {detailsFile && (
          <DetailsPanel
            file={detailsFile}
            onClose={() => setDetailsFile(null)}
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
                File akan ditambahkan ke folder &quot;{history.at(-1)?.name}&quot;
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
                className={`transition-colors ${
                  shareToken && index === 0
                    ? "cursor-default text-muted-foreground"
                    : "hover:text-primary"
                }`}
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
                onClick={() =>
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
                className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-sm gap-2 text-foreground"
                title="Bagikan Folder Ini"
              >
                <Share2 size={18} />
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
              onItemContextMenu={handleContextMenu}
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
    </motion.div>
  );
}