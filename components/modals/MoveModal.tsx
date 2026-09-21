"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import {
  X,
  Folder as FolderIcon,
  ChevronRight,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { DriveFile } from "@/lib/drive";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslations } from "next-intl";
import { fetchFolderPathApi } from "@/hooks/useFileFetching";
import ModalShell from "@/components/ui/ModalShell";

interface MoveModalProps {
  fileToMove?: DriveFile;
  filesToMove?: DriveFile[];
  onClose: () => void;
  onConfirmMove: (newParentId: string) => Promise<void>;
  initialFolderId?: string;
}

export default function MoveModal({
  fileToMove,
  filesToMove,
  onClose,
  onConfirmMove,
  initialFolderId,
}: MoveModalProps) {
  const rootId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;
  const rootName = "Google Drive";

  const [currentFolderId, setCurrentFolderId] = useState(
    initialFolderId || rootId,
  );
  const t = useTranslations("MoveModal");
  const [folderStack, setFolderStack] = useState<
    { id: string; name: string }[]
  >([]);
  const [subfolders, setSubfolders] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const { addToast } = useAppStore();

  useScrollLock(true);

  useEffect(() => {
    const initPath = async () => {
      setIsInitializing(true);
      if (initialFolderId && initialFolderId !== rootId) {
        try {
          const path = await fetchFolderPathApi(initialFolderId);
          if (path.length > 0) {
            setFolderStack(path);
            setIsInitializing(false);
            return;
          }
        } catch (err) {
          console.error("Failed to fetch folder path", err);
        }
      }

      setFolderStack([{ id: rootId, name: rootName }]);
      setIsInitializing(false);
    };

    initPath();
  }, [initialFolderId, rootId, rootName]);

  const fetchFolders = useCallback(
    async (folderId: string) => {
      setIsLoading(true);
      try {
        const url = new URL("/api/files", window.location.origin);
        url.searchParams.append("folderId", folderId);
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Failed to load folders");
        const data = await response.json();
        setSubfolders(
          data.files.filter((f: DriveFile) => f.isFolder && f.id !== folderId),
        );
      } catch (err: unknown) {
        addToast({
          message: err instanceof Error ? err.message : "Error",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    if (!isInitializing) {
      fetchFolders(currentFolderId);
    }
  }, [currentFolderId, fetchFolders, isInitializing]);

  const handleFolderClick = (folder: DriveFile) => {
    setCurrentFolderId(folder.id);
    setFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBackClick = () => {
    if (folderStack.length > 1) {
      const newStack = folderStack.slice(0, -1);
      const parentFolder = newStack[newStack.length - 1];
      setFolderStack(newStack);
      setCurrentFolderId(parentFolder.id);
    }
  };

  const handleMoveConfirm = async () => {
    setIsMoving(true);
    await onConfirmMove(currentFolderId);
  };

  const currentFolder = folderStack[folderStack.length - 1];
  const currentFolderName = currentFolder ? currentFolder.name : "...";

  const targetFiles = filesToMove || (fileToMove ? [fileToMove] : []);
  const itemCount = targetFiles.length;
  const itemName =
    itemCount === 1 ? `"${targetFiles[0].name}"` : `${itemCount} items`;

  const isMoveDisabled =
    isMoving ||
    targetFiles.some((f) => f.parents?.includes(currentFolderId)) ||
    targetFiles.some((f) => f.id === currentFolderId);

  return (
    <AnimatePresence>
      <ModalShell
        onClose={onClose}
        variant="slideUp"
        className="flex flex-col"
        showCloseButton={false}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-semibold mb-2">
          {t.rich("title", {
            itemName: () => <span className="font-bold">{itemName}</span>,
          })}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{t("selectDest")}</p>

        <div className="border rounded-md p-2 flex items-center mb-4">
          {folderStack.length > 1 && (
            <button
              onClick={handleBackClick}
              className="p-2 rounded-md hover:bg-accent"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <span className="font-medium px-2 truncate">{currentFolderName}</span>
        </div>

        <div className="h-64 overflow-y-auto border rounded-md">
          {isLoading || isInitializing ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin" />
            </div>
          ) : subfolders.length > 0 ? (
            <ul>
              {subfolders.map((folder) => (
                <li key={folder.id}>
                  <button
                    onClick={() => handleFolderClick(folder)}
                    className="w-full text-left flex items-center justify-between px-4 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <span className="flex items-center gap-2">
                      <FolderIcon size={16} /> {folder.name}
                    </span>
                    <ChevronRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              <p>{t("noSubfolders")}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md hover:bg-accent"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={isMoveDisabled}
            onClick={handleMoveConfirm}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50"
          >
            {isMoving ? t("moving") : t("moveHere")}
          </button>
        </div>
      </ModalShell>
    </AnimatePresence>
  );
}
