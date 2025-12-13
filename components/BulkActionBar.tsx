"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Download, X, Trash2, Move, Loader2, Share2 } from "lucide-react";
import DeleteConfirm from "./DeleteConfirm";
import MoveModal from "./MoveModal";
import JSZip from "jszip";
import ShareButton from "./ShareButton";

export default function BulkActionBar() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const {
    isBulkMode,
    selectedFiles,
    clearSelection,
    triggerRefresh,
    addToast,
    currentFolderId,
  } = useAppStore();

  const isVisible = isBulkMode && selectedFiles.length > 0;

  useEffect(() => {
    if (isVisible) {
      document.body.classList.add("bulk-action-bar-visible");
    } else {
      document.body.classList.remove("bulk-action-bar-visible");
    }
    return () => {
      document.body.classList.remove("bulk-action-bar-visible");
    };
  }, [isVisible]);

  const getFileNameFromHeader = (header: string | null): string => {
    if (!header) return "file";
    const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/);
    if (utf8Match && utf8Match[1]) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {}
    }
    const basicMatch = header.match(/filename="([^"]+)"/);
    if (basicMatch && basicMatch[1]) {
      return basicMatch[1];
    }
    return "file";
  };

  const handleBulkDownload = async () => {
    if (selectedFiles.length === 0) return;
    setIsDownloading(true);
    addToast({
      message: `Mempersiapkan ${selectedFiles.length} file...`,
      type: "info",
    });

    const zip = new JSZip();

    try {
      await Promise.all(
        selectedFiles.map(async (file) => {
          try {
            const response = await fetch(`/api/download?fileId=${file.id}`);
            if (!response.ok) {
              throw new Error(`Gagal mengunduh file ${file.id}`);
            }
            const blob = await response.blob();
            const fileName = getFileNameFromHeader(
              response.headers.get("Content-Disposition"),
            );
            zip.file(fileName, blob);
          } catch (fileError) {
            console.error(fileError);
            addToast({
              message: `Gagal memproses file ${file.id}.`,
              type: "error",
            });
          }
        }),
      );

      if (Object.keys(zip.files).length === 0) {
        throw new Error("Tidak ada file yang berhasil diproses untuk di-zip.");
      }

      addToast({ message: "Membuat file zip...", type: "info" });
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "download.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      clearSelection();
    } catch (error) {
      console.error("Download error:", error);
      addToast({
        message: (error as Error).message || "Gagal membuat file ZIP.",
        type: "error",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/files/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileIds: selectedFiles.map((f) => f.id),
          parentId: currentFolderId,
        }),
      });
      const result = await response.json();
      if (!response.ok && response.status !== 207)
        throw new Error(result.error || "Gagal menghapus item.");

      addToast({
        message: result.message,
        type: response.ok ? "success" : "info",
      });
      clearSelection();
      triggerRefresh();
    } catch (error: unknown) {
      addToast({
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBulkMove = async (newParentId: string) => {
    if (selectedFiles.length === 0 || !currentFolderId) return;
    setIsMoving(true);
    try {
      const response = await fetch("/api/files/bulk-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileIds: selectedFiles.map((f) => f.id),
          currentParentId: currentFolderId,
          newParentId,
        }),
      });
      const result = await response.json();
      if (!response.ok && response.status !== 207)
        throw new Error(result.error || "Failed to move items.");

      addToast({
        message: result.message,
        type: response.ok ? "success" : "info",
      });
      clearSelection();
      triggerRefresh();
    } catch (error: unknown) {
      addToast({
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
        type: "error",
      });
    } finally {
      setIsMoving(false);
      setShowMoveModal(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 w-full h-20 bg-background/80 backdrop-blur-lg border-t z-50 flex justify-center items-center"
          >
            <div className="flex items-center gap-2 sm:gap-4 bg-card border shadow-lg rounded-lg p-2">
              <span className="text-sm font-medium text-foreground px-2">
                {selectedFiles.length} item dipilih
              </span>

              <button
                onClick={handleBulkDownload}
                disabled={isDownloading}
                className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2 transition-colors"
              >
                {isDownloading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}

                <span className="hidden sm:inline">
                  {isDownloading ? "Mengunduh..." : "Unduh"}
                </span>
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="p-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400 flex items-center gap-2 transition-colors"
              >
                <Share2 size={18} />
                <span className="hidden sm:inline">Share</span>
              </button>

              <button
                onClick={() => setShowMoveModal(true)}
                disabled={isMoving}
                className="p-2 rounded-md bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-yellow-400 flex items-center gap-2 transition-colors"
              >
                <Move size={18} />
                <span
                  className="hidden
sm:inline"
                >
                  Pindahkan
                </span>
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="p-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-destructive/50 flex items-center gap-2 transition-colors"
              >
                <Trash2 size={18} />
                <span className="hidden sm:inline">Delete</span>
              </button>

              <button
                onClick={clearSelection}
                className="p-2 rounded-md hover:bg-muted text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShareModal && (
          <ShareButton
            items={selectedFiles}
            isOpen={true}
            onClose={() => setShowShareModal(false)}
          />
        )}
        {showDeleteConfirm && (
          <DeleteConfirm
            itemName={`${selectedFiles.length} item`}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleBulkDelete}
          />
        )}
        {showMoveModal && (
          <MoveModal
            fileToMove={{
              id: "bulk",
              name: `${selectedFiles.length} item`,
              parents: [currentFolderId || ""],
              isFolder: false,
              mimeType: "",
              modifiedTime: "",
              createdTime: "",
              hasThumbnail: false,
              webViewLink: "",
              trashed: false,
            }}
            onClose={() => setShowMoveModal(false)}
            onConfirmMove={handleBulkMove}
          />
        )}
      </AnimatePresence>
    </>
  );
}
