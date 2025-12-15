"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function BulkActionBar() {
  const { selectedFiles, clearSelection, addToast, triggerRefresh } =
    useAppStore();

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
  };

  if (selectedFiles.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-border/10"
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
          <Button
            size="sm"
            variant="ghost"
            className="hover:bg-background/20 hover:text-background h-8 px-2 text-xs"
            onClick={handleDownload}
          >
            <Download size={16} className="mr-2" />
            Download
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="hover:bg-background/20 hover:text-background h-8 px-2 text-xs text-red-400 hover:text-red-300"
            onClick={handleDelete}
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
