"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import type { DriveFile } from "@/lib/drive";
import { getFileType } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useFileActions } from "@/hooks/useFileActions";
import { useFileFetching } from "@/hooks/useFileFetching";
import { useUpload } from "@/hooks/useUpload";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useGallery } from "@/hooks/useGallery";
import { getErrorMessage } from "@/lib/errors";
import type {
  BrowserFile,
  FileBrowserActionEvent,
} from "@/components/file-browser/views/types";
import type { ShareTokenPayload } from "@/lib/store";

export interface FileBrowserProps {
  initialFolderId?: string;
  initialFolderPath?: { id: string; name: string }[];
  initialFiles?: DriveFile[];
  initialNextPageToken?: string | null;
}

function createSlug(name: string) {
  return encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());
}

export function useFileBrowserController({
  initialFolderId,
  initialFolderPath,
  initialFiles,
  initialNextPageToken,
}: FileBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations("FileBrowser");

  const [authTarget, setAuthTarget] = useState<{
    isLocked: boolean;
    folderId: string;
    folderName: string;
  }>({ isLocked: false, folderId: "", folderName: "" });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isFileRequestModalOpen, setIsFileRequestModalOpen] = useState(false);
  const [imageEditorFile, setImageEditorFile] = useState<DriveFile | null>(
    null,
  );
  const [showHistory, setShowHistory] = useState(false);

  const sort = useAppStore((state) => state.sort);
  const setSort = useAppStore((state) => state.setSort);
  const isBulkMode = useAppStore((state) => state.isBulkMode);
  const setBulkMode = useAppStore((state) => state.setBulkMode);
  const toggleSelection = useAppStore((state) => state.toggleSelection);
  const view = useAppStore((state) => state.view);
  const setView = useAppStore((state) => state.setView);
  const refreshKey = useAppStore((state) => state.refreshKey);
  const addToast = useAppStore((state) => state.addToast);
  const folderTokens = useAppStore((state) => state.folderTokens);
  const setFolderToken = useAppStore((state) => state.setFolderToken);
  const user = useAppStore((state) => state.user);
  const fetchUser = useAppStore((state) => state.fetchUser);
  const shareToken = useAppStore((state) => state.shareToken);
  const setShareToken = useAppStore((state) => state.setShareToken);
  const favorites = useAppStore((state) => state.favorites);
  const fetchFavorites = useAppStore((state) => state.fetchFavorites);
  const detailsFile = useAppStore((state) => state.detailsFile);
  const setDetailsFile = useAppStore((state) => state.setDetailsFile);
  const setCurrentFolderId = useAppStore((state) => state.setCurrentFolderId);
  const playAudio = useAppStore((state) => state.playAudio);
  const navigatingId = useAppStore((state) => state.navigatingId);
  const setNavigatingId = useAppStore((state) => state.setNavigatingId);
  const setCurrentFileId = useAppStore((state) => state.setCurrentFileId);

  const {
    files,
    history,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    nextPageToken,
    currentFolderId,
    authModalInfo,
    error,
  } = useFileFetching({
    initialFolderId,
    initialFolderPath,
    initialFiles,
    initialNextPageToken,
    shareToken,
    folderTokens,
    addToast,
    router,
    refreshKey,
    locale,
  });

  useEffect(() => {
    if (currentFolderId) {
      setCurrentFolderId(currentFolderId);
    }
  }, [currentFolderId, setCurrentFolderId]);

  useEffect(() => {
    setNavigatingId(null);
    setCurrentFileId(null);
  }, [pathname, setNavigatingId, setCurrentFileId]);

  const isGuest = user?.isGuest === true;
  const isAdmin = user?.role === "ADMIN" && !isGuest;
  const isEditor = user?.role === "EDITOR" && !isGuest;
  const canEdit = (isAdmin || isEditor) && !isGuest;

  const upload = useUpload({
    currentFolderId,
    isAdmin: canEdit,
    triggerRefresh: useAppStore.getState().triggerRefresh,
  });

  const dragAndDrop = useDragAndDrop({
    isAdmin: canEdit,
    isBulkMode,
    selectedFiles: useAppStore.getState().selectedFiles,
    currentFolderId,
    triggerRefresh: useAppStore.getState().triggerRefresh,
    clearSelection: useAppStore.getState().clearSelection,
    addToast,
  });

  const fileActions = useFileActions(currentFolderId);
  const gallery = useGallery(files);

  const readmeFile = useMemo(() => {
    return files.find(
      (file) => file.name.toLowerCase() === "readme.md" && !file.trashed,
    );
  }, [files]);

  const sortedFiles = useMemo<BrowserFile[]>(() => {
    return [...files]
      .map((file) => ({ ...file, isFavorite: favorites.includes(file.id) }))
      .sort((a, b) => {
        const isAsc = sort.order === "asc" ? 1 : -1;
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        if (sort.key === "name") {
          return a.name.localeCompare(b.name, "id", { numeric: true }) * isAsc;
        }
        if (sort.key === "size") {
          return (Number(a.size || 0) - Number(b.size || 0)) * isAsc;
        }
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
    if (!shareToken) return;

    try {
      const [, payloadBase64] = shareToken.split(".");
      if (!payloadBase64) return;

      const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((char) => {
            return "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(""),
      );
      const payload = JSON.parse(jsonPayload) as ShareTokenPayload;

      if (!payload.exp) {
        return;
      }

      const expireTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeLeft = expireTime - currentTime;

      const handleRedirect = () => {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("share_token");
        router.push(
          `/login?error=ShareLinkExpired&callbackUrl=${encodeURIComponent(
            currentUrl.pathname + currentUrl.search,
          )}`,
        );
      };

      if (timeLeft <= 0) {
        handleRedirect();
        return;
      }

      const timeoutId = setTimeout(handleRedirect, timeLeft + 500);
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error("Auto-redirect timer error:", error);
    }
  }, [shareToken, router]);

  useEffect(() => {
    if (authModalInfo) {
      setAuthTarget({
        isLocked: true,
        folderId: authModalInfo.folderId,
        folderName: authModalInfo.folderName,
      });
      return;
    }

    setAuthTarget({ isLocked: false, folderId: "", folderName: "" });
  }, [authModalInfo]);

  const handleAuthSubmit = async (id: string, password: string) => {
    setIsAuthLoading(true);
    try {
      const response = await fetch("/api/auth/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: authTarget.folderId, id, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t("wrongCredentials"));
      }

      document.cookie = `folder_token_${authTarget.folderId}=${data.token}; path=/; max-age=3600; SameSite=Lax`;
      setFolderToken(authTarget.folderId, data.token);
      addToast({ message: t("accessGranted"), type: "success" });
      setAuthTarget({ isLocked: false, folderId: "", folderName: "" });

      queryClient.invalidateQueries({
        queryKey: ["files", authTarget.folderId],
      });
    } catch (error: unknown) {
      addToast({
        message: getErrorMessage(error, t("wrongCredentials")),
        type: "error",
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleItemClick = (file: BrowserFile) => {
    if (isBulkMode) {
      toggleSelection(file);
      return;
    }

    if (getFileType(file) === "audio") {
      playAudio(file);
      return;
    }

    let destinationUrl = "";
    if (file.isFolder) {
      destinationUrl = `/folder/${file.id}`;
    } else {
      destinationUrl = `/folder/${currentFolderId}/file/${file.id}/${createSlug(
        file.name,
      )}`;
    }

    if (shareToken) {
      destinationUrl += `?share_token=${shareToken}`;
    }

    setNavigatingId(file.id);
    router.push(destinationUrl);
  };

  const handlePrefetchFolder = useCallback(
    (folderId: string) => {
      const queryKey = [
        "files",
        folderId,
        shareToken,
        folderTokens[folderId],
        refreshKey,
      ];

      const existingData = queryClient.getQueryState(queryKey);
      if (existingData?.fetchStatus === "fetching" || existingData?.data) {
        return;
      }
      if (existingData?.status === "error") {
        return;
      }

      let folderUrl =
        folderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID
          ? "/"
          : `/folder/${folderId}`;
      if (shareToken) {
        folderUrl += `?share_token=${shareToken}`;
      }
      router.prefetch(folderUrl);

      const fetchUrl = new URL(window.location.origin + "/api/files");
      fetchUrl.searchParams.append("folderId", folderId);
      if (shareToken) {
        fetchUrl.searchParams.append("share_token", shareToken);
      }

      queryClient
        .prefetchInfiniteQuery({
          queryKey,
          queryFn: async () => {
            const headers = new Headers();
            if (folderTokens[folderId]) {
              headers.append(
                "Authorization",
                `Bearer ${folderTokens[folderId]}`,
              );
            }

            const response = await fetch(fetchUrl.toString(), { headers });
            if (response.status === 401) {
              return null;
            }
            if (!response.ok) {
              throw new Error("Prefetch failed");
            }

            return response.json();
          },
          initialPageParam: null,
        })
        .catch(() => {});
    },
    [router, shareToken, queryClient, folderTokens, refreshKey],
  );

  const handlePrefetchItem = useCallback(
    (file: BrowserFile) => {
      if (file.isFolder) {
        if (file.isProtected && !folderTokens[file.id]) return;
        handlePrefetchFolder(file.id);
        return;
      }

      let destinationUrl = `/folder/${currentFolderId}/file/${file.id}/${createSlug(
        file.name,
      )}`;
      if (shareToken) {
        destinationUrl += `?share_token=${shareToken}`;
      }
      router.prefetch(destinationUrl);
    },
    [handlePrefetchFolder, currentFolderId, shareToken, router, folderTokens],
  );

  const handleContextMenuWrapper = useCallback(
    (event: { clientX: number; clientY: number }, file: BrowserFile) => {
      if (isBulkMode || shareToken) return;
      setActiveFileId(file.id);
      fileActions.handleContextMenu(event, file);
    },
    [isBulkMode, shareToken, fileActions],
  );

  const handleQuickShare = (
    event: FileBrowserActionEvent,
    file: BrowserFile,
  ) => {
    event.stopPropagation();
    if (!isAdmin) return;
    fileActions.handleShare(file);
  };

  const handleQuickDownload = (
    file: BrowserFile,
    event?: FileBrowserActionEvent,
  ) => {
    if (event) {
      event.stopPropagation();
    }

    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) {
      url += `&share_token=${shareToken}`;
    }

    const protectedParent = [...history]
      .reverse()
      .find((folder) => folderTokens[folder.id]);
    const token = protectedParent ? folderTokens[protectedParent.id] : null;

    if (token) {
      url += `&access_token=${token}`;
    }

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 5000);
  };

  const handleBreadcrumbClick = (folderId: string) => {
    if (shareToken && folderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID) {
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

  const isLockedImmediate = !!authModalInfo || authTarget.isLocked;
  const shouldShowHeader = !isLockedImmediate && (!isLoading || refreshKey > 0);

  return {
    rootProps: {
      onDragOver: upload.handleDragOver,
      onDragLeave: upload.handleDragLeave,
      onDrop: upload.handleDropUpload,
    },
    shouldShowHeader,
    headerProps: {
      history,
      shareToken,
      isAdmin,
      isBulkMode,
      view,
      dragOverBreadcrumb: dragAndDrop.dragOverBreadcrumb,
      activeFileId,
      onBreadcrumbClick: handleBreadcrumbClick,
      onBreadcrumbDragOver: dragAndDrop.handleBreadcrumbDragOver,
      onBreadcrumbDragLeave: dragAndDrop.handleBreadcrumbDragLeave,
      onBreadcrumbDrop: (event: React.DragEvent, folder: { id: string }) =>
        dragAndDrop.onDropOnBreadcrumb(event, folder),
      onUploadClick: () => upload.setIsUploadModalOpen(true),
      onShareFolderClick: () =>
        fileActions.handleShare({
          id: currentFolderId,
          name: history[history.length - 1]?.name || t("folderDefaultName"),
          isFolder: true,
          mimeType: "application/vnd.google-apps.folder",
          modifiedTime: "",
          createdTime: "",
          hasThumbnail: false,
          webViewLink: "",
          trashed: false,
        }),
      onRequestFileClick: () => setIsFileRequestModalOpen(true),
      onToggleBulkMode: () => setBulkMode(!isBulkMode),
      onSetView: setView,
      onDetailsClick: () => {
        const file = files.find((item) => item.id === activeFileId);
        if (file) {
          setDetailsFile(file);
        }
      },
      sort,
      onSortChange: setSort,
      onPrefetchFolder: handlePrefetchFolder,
    },
    contentProps: {
      isLoading,
      sessionStatus,
      shareToken,
      isLocked: isLockedImmediate,
      lockedFolderName: authTarget.folderName,
      lockedFolderId: authTarget.folderId,
      onAuthSubmit: handleAuthSubmit,
      isAuthLoading,
      readmeFile,
      sortedFiles,
      activeFileId,
      error,
      isAdmin,
      uploads: upload.uploads,
      onItemClick: handleItemClick,
      onContextMenu: handleContextMenuWrapper,
      onShareClick: handleQuickShare,
      onDetailsClick: (event: FileBrowserActionEvent, file: BrowserFile) => {
        event.stopPropagation();
        setDetailsFile(file);
      },
      onDownloadClick: (event: FileBrowserActionEvent, file: BrowserFile) =>
        handleQuickDownload(file, event),
      onDragStart: dragAndDrop.handleDragStart,
      onFileDrop: dragAndDrop.onDropOnFolder,
      onPrefetchItem: handlePrefetchItem,
      isFetchingNextPage,
      nextPageToken,
      fetchNextPage,
      navigatingId,
      currentFolderId,
    },
    modalsProps: {
      authModal: { isOpen: false, folderId: "", folderName: "" },
      isAuthLoading,
      onCloseAuth: () => {},
      onAuthSubmit: () => {},
      isFileRequestModalOpen,
      setIsFileRequestModalOpen,
      currentFolderId,
      folderName: history[history.length - 1]?.name || t("folderDefaultName"),
      imageEditorFile,
      setImageEditorFile,
      contextMenu: fileActions.contextMenu,
      setContextMenu: fileActions.setContextMenu,
      actionState: fileActions.actionState,
      setActionState: fileActions.setActionState,
      handleRename: fileActions.handleRename,
      handleDelete: fileActions.handleDelete,
      handleShare: fileActions.handleShare,
      handleMove: fileActions.handleMove,
      handleToggleFavorite: fileActions.handleToggleFavorite,
      handleCopy: fileActions.handleCopy,
      handleDownload: (file: DriveFile) => handleQuickDownload(file),
      handleArchivePreview: fileActions.handleArchivePreview,
      previewFile: fileActions.previewFile,
      setPreviewFile: fileActions.setPreviewFile,
      archivePreview: fileActions.archivePreview,
      setArchivePreview: fileActions.setArchivePreview,
      detailsFile,
      setDetailsFile,
      isUploadModalOpen: upload.isUploadModalOpen,
      setIsUploadModalOpen: upload.setIsUploadModalOpen,
      droppedFiles: upload.droppedFiles,
      handleFileSelect: upload.handleFileSelect,
      handleDragOver: upload.handleDragOver,
      handleDragLeave: upload.handleDragLeave,
      handleDropUpload: upload.handleDropUpload,
      isDragging: upload.isDragging,
      isAdmin,
      getSharePath: fileActions.getSharePath,
      favorites,
      showHistory,
      setShowHistory,
      handleTogglePin: fileActions.handleTogglePin,
      isFilePinned: fileActions.isFilePinned,
      shareToken,
    },
    galleryProps: {
      isOpen: gallery.isOpen,
      initialIndex: gallery.startIndex,
      images: gallery.imageFiles,
      onClose: gallery.closeGallery,
    },
  };
}
