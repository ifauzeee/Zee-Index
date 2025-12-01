import { useState, useCallback } from "react";
import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from "@/lib/store";

export type ActionState = {
  type: "rename" | "delete" | "share" | "move" | "copy" | null;
  file: DriveFile | null;
};

export type ContextMenuState = {
  x: number;
  y: number;
  file: DriveFile;
} | null;

export function useFileActions(currentFolderId: string) {
  const { addToast, triggerRefresh, favorites, toggleFavorite, pinnedFolders, addPin, removePin } = useAppStore();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [actionState, setActionState] = useState<ActionState>({
    type: null,
    file: null,
  });
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [archivePreview, setArchivePreview] = useState<DriveFile | null>(null);

  const handleContextMenu = useCallback(
    (event: { clientX: number; clientY: number }, file: DriveFile) => {
      setContextMenu({ x: event.clientX, y: event.clientY, file });
    },
    [],
  );

  const createSlug = (name: string) =>
    encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());

  const getSharePath = (file: DriveFile) => {
    if (file.isFolder) return `/folder/${file.id}`;
    return `/folder/${currentFolderId}/file/${file.id}/${createSlug(
      file.name,
    )}`;
  };

  const handleShare = (file: DriveFile | null) => {
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
      triggerRefresh();
      addToast({ message: "Nama berhasil diubah!", type: "success" });
      setActionState({ type: null, file: null });
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    }
  };

  const handleDelete = async () => {
    if (!actionState.file) return;
    const fileToDelete = actionState.file;
    setActionState({ type: null, file: null });
    try {
      const response = await fetch("/api/files/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: fileToDelete.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus file");
      triggerRefresh();
      addToast({ message: "File berhasil dihapus!", type: "success" });
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
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
      triggerRefresh();
      addToast({ message: "File berhasil dipindahkan!", type: "success" });
      setActionState({ type: null, file: null });
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    }
  };

  const handleArchivePreview = () => {
    if (contextMenu?.file) {
      setArchivePreview(contextMenu.file);
    }
    setContextMenu(null);
  };

  const handleTogglePin = async () => {
    if (!contextMenu?.file) return;
    const { id } = contextMenu.file;
    const isPinned = pinnedFolders.some(f => f.id === id);

    if (isPinned) {
      await removePin(id);
    } else {
      await addPin(id);
    }
    setContextMenu(null);
  };

  const isFilePinned = (fileId: string) => {
    return pinnedFolders.some(f => f.id === fileId);
  };

  return {
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
  };
}
