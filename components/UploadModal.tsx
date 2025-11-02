"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UploadCloud,
  FolderPlus,
  File as FileIcon,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import React from "react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFiles?: FileList | null;
}

interface UploadProgress {
  name: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

export default function UploadModal({
  isOpen,
  onClose,
  initialFiles,
}: UploadModalProps) {
  const { currentFolderId, triggerRefresh, addToast } = useAppStore();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
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
      if (!response.ok) throw new Error(data.error || "Gagal membuat folder");
      addToast({
        message: `Folder "${newFolderName}" berhasil dibuat.`,
        type: "success",
      });
      triggerRefresh();
      setNewFolderName("");
      onClose();
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsCreatingFolder(false);
    }
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
  };

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !currentFolderId) return;

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
    [currentFolderId, triggerRefresh],
  );

  useEffect(() => {
    if (isOpen && initialFiles) {
      handleFileUpload(initialFiles);
    }
  }, [isOpen, initialFiles, handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

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
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
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
              Upload File atau Buat Folder Baru
            </h3>

            <div className="space-y-6">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50",
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">
                    Klik untuk memilih file
                  </span>{" "}
                  atau seret dan lepas di sini
                </p>
              </div>

              <form onSubmit={handleCreateFolder} className="space-y-2">
                <label className="text-sm font-medium">Buat Folder Baru</label>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Nama Folder Baru"
                      className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingFolder || !newFolderName.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:bg-primary/50 flex items-center gap-2"
                  >
                    {isCreatingFolder ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      "Buat"
                    )}
                  </button>
                </div>
              </form>
            </div>

            {Object.keys(uploads).length > 0 && (
              <div className="mt-6 max-h-40 overflow-y-auto pr-2 space-y-3">
                {Object.values(uploads).map((up) => (
                  <div key={up.name}>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <p className="truncate font-medium flex items-center gap-2">
                        <FileIcon size={14} />
                        <span className="max-w-[200px] truncate">
                          {up.name}
                        </span>
                      </p>
                      <span
                        className={cn(
                          "text-xs font-mono",
                          up.status === "error" && "text-red-500",
                          up.status === "success" && "text-green-500",
                        )}
                      >
                        {up.status === "uploading" &&
                          `${up.progress.toFixed(0)}%`}
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
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}