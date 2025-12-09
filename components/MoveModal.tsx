"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Folder as FolderIcon,
  ChevronRight,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { DriveFile } from "@/lib/googleDrive";
import { useScrollLock } from "@/hooks/useScrollLock";

interface MoveModalProps {
  fileToMove: DriveFile;
  onClose: () => void;
  onConfirmMove: (newParentId: string) => Promise<void>;
}

export default function MoveModal({
  fileToMove,
  onClose,
  onConfirmMove,
}: MoveModalProps) {
  const [currentFolderId, setCurrentFolderId] = useState(
    process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!,
  );
  const [folderStack, setFolderStack] = useState([
    {
      id: process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!,
      name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || "Beranda",
    },
  ]);
  const [subfolders, setSubfolders] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const { addToast } = useAppStore();

  useScrollLock(true);

  const fetchFolders = useCallback(
    async (folderId: string) => {
      setIsLoading(true);
      try {
        const url = new URL("/api/files", window.location.origin);
        url.searchParams.append("folderId", folderId);
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Gagal memuat folder");
        const data = await response.json();
        setSubfolders(data.files.filter((f: DriveFile) => f.isFolder));
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
    fetchFolders(currentFolderId);
  }, [currentFolderId, fetchFolders]);

  const handleFolderClick = (folder: DriveFile) => {
    setCurrentFolderId(folder.id);
    setFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBackClick = () => {
    if (folderStack.length > 1) {
      const newStack = folderStack.slice(0, -1);
      setFolderStack(newStack);
      setCurrentFolderId(newStack[newStack.length - 1].id);
    }
  };

  const handleMoveConfirm = async () => {
    setIsMoving(true);
    await onConfirmMove(currentFolderId);
  };

  const currentFolderName = folderStack[folderStack.length - 1].name;
  const isMoveDisabled =
    isMoving || fileToMove.parents?.includes(currentFolderId);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-md bg-background p-6 rounded-lg shadow-xl flex flex-col"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
          <h3 className="text-lg font-semibold mb-2">
            Pindahkan &quot;{fileToMove.name}&quot;
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Pilih folder tujuan:
          </p>

          <div className="border rounded-md p-2 flex items-center mb-4">
            {folderStack.length > 1 && (
              <button
                onClick={handleBackClick}
                className="p-2 rounded-md hover:bg-accent"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <span className="font-medium px-2 truncate">
              {currentFolderName}
            </span>
          </div>

          <div className="h-64 overflow-y-auto border rounded-md">
            {isLoading ? (
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
                <p>Tidak ada subfolder</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md hover:bg-accent"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isMoveDisabled}
              onClick={handleMoveConfirm}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50"
            >
              {isMoving ? "Memindahkan..." : `Pindahkan ke Sini`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
