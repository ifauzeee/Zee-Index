"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Trash2, Copy, FolderInput } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/providers/ModalProvider";
import MoveModal from "@/components/modals/MoveModal";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { useTranslations } from "next-intl";

export function BulkActionBar() {
  const {
    selectedFiles,
    clearSelection,
    addToast,
    triggerRefresh,
    isSidebarOpen,
    user,
  } = useAppStore();
  const t = useTranslations("BulkActionBar");
  const { confirm } = useConfirm();
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleDownload = async () => {
    const filesToZip = selectedFiles.filter(
      (f) => f.mimeType !== "application/vnd.google-apps.folder",
    );

    if (filesToZip.length === 0) {
      addToast({ message: t("zipError"), type: "error" });
      return;
    }

    addToast({
      message: t("zipping", { count: filesToZip.length }),
      type: "info",
    });
    setIsProcessing(true);

    try {
      const zip = new JSZip();
      const folderName = "zee-index-archive";
      const folder = zip.folder(folderName);

      if (!folder) throw new Error(t("zipFolderError"));

      const promises = filesToZip.map(async (file) => {
        try {
          const response = await fetch(`/api/download?fileId=${file.id}`);
          if (!response.ok) throw new Error(t("networkError"));
          const blob = await response.blob();
          folder.file(file.name, blob);
        } catch (error) {
          console.error(`Failed to download ${file.name}`, error);
          addToast({
            message: t("skipError", { name: file.name }),
            type: "error",
          });
        }
      });

      await Promise.all(promises);

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `zee-files-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast({ message: t("zipStarted"), type: "success" });
      clearSelection();
    } catch (error) {
      console.error("Zip error:", error);
      addToast({ message: t("zipGenError"), type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (
      !(await confirm(t("deleteConfirm", { count: selectedFiles.length }), {
        title: t("deleteTitle"),
        variant: "destructive",
        confirmText: t("deleteBtn"),
      }))
    )
      return;

    addToast({ message: t("deleting"), type: "info" });
    setIsProcessing(true);

    try {
      for (const file of selectedFiles) {
        await fetch("/api/files/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: file.id }),
        });
      }
      clearSelection();
      triggerRefresh();
      addToast({ message: t("itemsDeleted"), type: "success" });
    } catch {
      addToast({ message: t("deleteFailed"), type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    addToast({ message: t("copying"), type: "info" });
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
      addToast({
        message: t("copiedSuccess", { count: successCount }),
        type: "success",
      });
      if (successCount === selectedFiles.length) {
        clearSelection();
      }
    } catch {
      addToast({ message: t("copyFailed"), type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoveConfirm = async (newParentId: string) => {
    setIsProcessing(true);
    addToast({ message: t("moving"), type: "info" });

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
      if (!response.ok) throw new Error(result.error || t("moveFailed"));

      addToast({
        message: result.message || t("moveSuccess"),
        type: "success",
      });
      triggerRefresh();
      clearSelection();
      setIsMoveModalOpen(false);
    } catch (error: any) {
      addToast({ message: error.message || t("moveFailed"), type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const isAdmin = user?.role === "ADMIN";

  if (!mounted || selectedFiles.length === 0) return null;

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
              {t("selected", { count: selectedFiles.length })}
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
                  {t("move")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isProcessing}
                  className="hover:bg-background/20 hover:text-background h-8 px-2 text-xs"
                  onClick={handleCopy}
                >
                  <Copy size={16} className="mr-2" />
                  {t("copy")}
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
              {t("download")}
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                className="hover:bg-background/20 hover:text-background h-8 px-2 text-xs text-red-400 hover:text-red-300"
                onClick={handleDelete}
              >
                <Trash2 size={16} className="mr-2" />
                {t("delete")}
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
