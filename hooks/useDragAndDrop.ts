import { useState, useCallback } from "react";
import type { DriveFile } from "@/lib/googleDrive";
import React from "react";

interface UseDragAndDropProps {
  isAdmin: boolean;
  isBulkMode: boolean;
  selectedFiles: DriveFile[];
  currentFolderId: string;
  triggerRefresh: () => void;
  clearSelection: () => void;
  addToast: (toast: {
    message: string;
    type: "error" | "info" | "success";
  }) => void;
}

export function useDragAndDrop({
  isAdmin,
  isBulkMode,
  selectedFiles,
  currentFolderId,
  triggerRefresh,
  clearSelection,
  addToast,
}: UseDragAndDropProps) {
  const [isDropMoving, setIsDropMoving] = useState(false);
  const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState<string | null>(
    null,
  );

  const handleDropMove = useCallback(
    async (
      filesToMove: DriveFile[],
      sourceFolderId: string,
      newParentId: string,
    ) => {
      setIsDropMoving(true);
      try {
        const response = await fetch("/api/files/bulk-move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileIds: filesToMove.map((f) => f.id),
            currentParentId: sourceFolderId,
            newParentId,
          }),
        });
        const result = await response.json();
        if (!response.ok && response.status !== 207)
          throw new Error(result.error || "Gagal memindahkan item.");
        addToast({
          message: result.message,
          type: response.ok ? "success" : "info",
        });
        triggerRefresh();
        clearSelection();
      } catch (error: any) {
        addToast({ message: error.message, type: "error" });
      } finally {
        setIsDropMoving(false);
      }
    },
    [addToast, triggerRefresh, clearSelection],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, file: DriveFile) => {
      if (!isAdmin) {
        e.preventDefault();
        return;
      }

      let filesToDrag: DriveFile[];
      const fileIsSelected = selectedFiles.some((f) => f.id === file.id);
      if (isBulkMode && fileIsSelected) {
        filesToDrag = selectedFiles;
      } else {
        filesToDrag = [file];
      }

      const dragData = {
        type: "files",
        files: filesToDrag,
        sourceFolderId: currentFolderId,
      };
      e.dataTransfer.setData("application/json", JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = "move";
    },
    [isAdmin, isBulkMode, selectedFiles, currentFolderId],
  );

  const onDropOnFolder = useCallback(
    (e: React.DragEvent, targetFolder: DriveFile) => {
      e.preventDefault();
      e.stopPropagation();

      let data;
      try {
        data = JSON.parse(e.dataTransfer.getData("application/json"));
      } catch {
        return;
      }

      if (data.type !== "files" || !data.files || !data.sourceFolderId) return;
      if (data.sourceFolderId === targetFolder.id) return;
      if (data.files.some((f: DriveFile) => f.id === targetFolder.id)) return;

      handleDropMove(data.files, data.sourceFolderId, targetFolder.id);
    },
    [handleDropMove],
  );

  const onDropOnBreadcrumb = useCallback(
    (e: React.DragEvent, targetFolder: { id: string }) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverBreadcrumb(null);

      let data;
      try {
        data = JSON.parse(e.dataTransfer.getData("application/json"));
      } catch {
        return;
      }

      if (data.type !== "files" || !data.files || !data.sourceFolderId) return;
      if (data.sourceFolderId === targetFolder.id) return;
      if (data.files.some((f: DriveFile) => f.id === targetFolder.id)) return;

      handleDropMove(data.files, data.sourceFolderId, targetFolder.id);
    },
    [handleDropMove],
  );

  const handleBreadcrumbDragOver = useCallback(
    (e: React.DragEvent, folderId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverBreadcrumb(folderId);
      e.dataTransfer.dropEffect = "move";
    },
    [],
  );

  const handleBreadcrumbDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverBreadcrumb(null);
  }, []);

  return {
    isDropMoving,
    dragOverBreadcrumb,
    handleDragStart,
    onDropOnFolder,
    onDropOnBreadcrumb,
    handleBreadcrumbDragOver,
    handleBreadcrumbDragLeave,
  };
}
