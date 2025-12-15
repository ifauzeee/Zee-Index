"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Trash2, Copy, FolderInput } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import MoveModal from "./MoveModal";
import { cn } from "@/lib/utils";

export function BulkActionBar() {
  const {
    selectedFiles,
    clearSelection,
    addToast,
    triggerRefresh,
    isSidebarOpen,
    user,
  } = useAppStore();
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownload = async () => {
    addToast({
      message: "Downloading " + selectedFiles.length + " files...",
      type: "info",
    });

    selectedFiles.forEach((file, index) => {
      if (file.mimeType !== "application/vnd.google-apps.folder") {
        setTimeout(() => {
          const link = document.createElement("a");
          link.href = `/api/download?fileId=${file.id}`;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 500);
      }
    });
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedFiles.length} items?`)) return;

    addToast({ message: "Deleting items...", type: "info" });
    setIsProcessing(true);

    try {
      for (const file of selectedFiles) {
        await fetch("/api/file", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: file.id }),
        });
      }
      clearSelection();
      triggerRefresh();
      addToast({ message: "Items deleted", type: "success" });
    } catch {
      addToast({ message: "Failed to delete some items", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    addToast({ message: "Copying items...", type: "info" });
    setIsProcessing(true);
    let successCount = 0;

    try {
      for (const file of selectedFiles) {
        const response = await fetch("/api/files/copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: file.id }),
        });
        if (response.ok) successCount++;
      }
      triggerRefresh();
      addToast({ message: `${successCount} items copied`, type: "success" });
      if (successCount === selectedFiles.length) {
        clearSelection();
      }
    } catch {
      addToast({ message: "Copy failed", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoveConfirm = async (newParentId: string) => {
    setIsProcessing(true);
    addToast({ message: "Moving items...", type: "info" });

    try {
      const response = await fetch("/api/files/bulk-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileIds: selectedFiles.map((f) => f.id),
          currentParentId: selectedFiles[0]?.parents?.[0] || "",
          newParentId,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Move failed");

      addToast({
        message: result.message || "Moved successfully",
        type: "success",
      });
      triggerRefresh();
      clearSelection();
      setIsMoveModalOpen(false);
    } catch (error: any) {
      addToast({ message: error.message || "Move failed", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const isAdmin = user?.role === "ADMIN";

  if (selectedFiles.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: 100, x: "-50%", opacity: 0 }}
          className={cn(
            "fixed bottom-6 left-1/2 z-50 bg-background/80 backdrop-blur-md text-foreground px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-border/50 transition-all duration-300",
            isSidebarOpen && "lg:left-[calc(50%+8rem)]",
          )}
        >
          <div className="flex items-center gap-3 border-r border-background/20 pr-4">
            <span className="font-bold text-sm whitespace-nowrap">
              {selectedFiles.length} selected
            </span>
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-background/20 rounded-full transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isProcessing}
                  className="hover:bg-background/20 hover:text-background h-8 px-2 text-xs"
                  onClick={() => setIsMoveModalOpen(true)}
                >
                  <FolderInput size={16} className="mr-2" />
                  Move
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isProcessing}
                  className="hover:bg-background/20 hover:text-background h-8 px-2 text-xs"
                  onClick={handleCopy}
                >
                  <Copy size={16} className="mr-2" />
                  Copy
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="hover:bg-background/20 hover:text-background h-8 px-2 text-xs"
              onClick={handleDownload}
            >
              <Download size={16} className="mr-2" />
              Download
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                className="hover:bg-background/20 hover:text-background h-8 px-2 text-xs text-red-400 hover:text-red-300"
                onClick={handleDelete}
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {isMoveModalOpen && (
        <MoveModal
          filesToMove={selectedFiles}
          onClose={() => setIsMoveModalOpen(false)}
          onConfirmMove={handleMoveConfirm}
          initialFolderId={selectedFiles[0]?.parents?.[0]}
        />
      )}
    </>
  );
}
