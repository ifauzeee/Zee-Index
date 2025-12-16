"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud, FolderPlus, FilePlus, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/hooks/useScrollLock";
import { FileEntry } from "@/lib/fileParser";
import { useTranslations } from "next-intl";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFiles?: FileList | FileEntry[] | null;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDropUpload: (e: React.DragEvent) => Promise<void>;
  isDragging: boolean;
}

export default function UploadModal({
  isOpen,
  onClose,
  handleFileSelect,
  handleDragOver,
  handleDragLeave,
  handleDropUpload,
  isDragging,
}: UploadModalProps) {
  const { currentFolderId, triggerRefresh, addToast } = useAppStore();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("UploadModal");

  useScrollLock(isOpen);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !currentFolderId) return;
    setIsCreatingFolder(true);
    try {
      const response = await fetch("/api/folder/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderName: newFolderName,
          parentId: currentFolderId,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || t("failedToCreateFolder"));
      addToast({
        message: t("folderCreated", { folderName: newFolderName }),
        type: "success",
      });
      triggerRefresh();
      setNewFolderName("");
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("occurredError");
      addToast({ message: message, type: "error" });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-lg bg-background p-6 rounded-lg shadow-xl"
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
            <h3 className="text-lg font-semibold mb-4">
              {t("uploadFileFolder")}
            </h3>

            <div className="space-y-6">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer group",
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50",
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropUpload}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  type="file"
                  multiple
                  ref={folderInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  {...({
                    webkitdirectory: "",
                    directory: "",
                  } as React.InputHTMLAttributes<HTMLInputElement> & {
                    webkitdirectory?: string;
                    directory?: string;
                  })}
                />

                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  {t("dragHere")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("orClickBelow")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
                >
                  <FilePlus size={16} /> {t("selectFile")}
                </button>
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
                >
                  <FolderPlus size={16} /> {t("selectFolder")}
                </button>
              </div>

              <div className="border-t my-4"></div>

              <form onSubmit={handleCreateFolder} className="space-y-2">
                <label className="text-sm font-medium">
                  {t("createFolderInDrive")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder={t("folderName")}
                    className="flex-grow px-3 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingFolder || !newFolderName.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCreatingFolder ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      t("create")
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
