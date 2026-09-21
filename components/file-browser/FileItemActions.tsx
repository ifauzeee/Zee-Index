"use client";

import React from "react";
import { Share2, Download, Star, Info, MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { FileBrowserActionEvent, BrowserFile } from "./views/types";

interface FileItemActionsProps {
  file: BrowserFile;
  view: string;
  isAdmin: boolean;
  isBulkMode: boolean;
  uploadStatus?: "uploading" | "error" | "success";
  compactClass?: boolean;
  onShare: (e: FileBrowserActionEvent) => void;
  onDownload: (e: FileBrowserActionEvent) => void;
  onToggleFavorite?: (e: FileBrowserActionEvent, file: BrowserFile) => void;
  onShowDetails: (e: FileBrowserActionEvent) => void;
  onContextMenu: (
    event: { clientX: number; clientY: number },
    file: BrowserFile,
  ) => void;
  isSelected: boolean;
  toggleSelection: (file: BrowserFile) => void;
}

const FileItemActions: React.FC<FileItemActionsProps> = ({
  file,
  view,
  isAdmin,
  isBulkMode,
  uploadStatus,
  compactClass,
  onShare,
  onDownload,
  onToggleFavorite,
  onShowDetails,
  onContextMenu,
  isSelected,
  toggleSelection,
}) => {
  const t = useTranslations("FileItem");
  const isUploading = uploadStatus === "uploading";

  const createActionEvent = (
    event: React.MouseEvent,
  ): FileBrowserActionEvent => ({
    preventDefault: () => event.preventDefault(),
    stopPropagation: () => event.stopPropagation(),
    shiftKey: event.shiftKey,
  });

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as Element).getBoundingClientRect();
    onContextMenu({ clientX: rect.left, clientY: rect.bottom + 5 }, file);
  };

  return (
    <>
      {!isBulkMode && !isUploading && (
        <div
          className={cn(
            "hidden md:flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 focus-within:opacity-100 shrink-0 pointer-events-auto",
            compactClass && "scale-90 origin-right",
          )}
        >
          {isAdmin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShare(createActionEvent(e));
              }}
              title={t("share")}
              aria-label={t("share")}
              className="p-2 rounded-full hover:bg-muted select-none"
            >
              <Share2 size={16} />
            </button>
          )}
          {!file.isFolder && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDownload(createActionEvent(e));
              }}
              title={t("download")}
              aria-label={t("download")}
              className="p-2 rounded-full hover:bg-muted select-none"
            >
              <Download size={16} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite?.(createActionEvent(e), file);
            }}
            title={
              file.isFavorite ? t("removeFromFavorites") : t("addToFavorites")
            }
            aria-label={
              file.isFavorite ? t("removeFromFavorites") : t("addToFavorites")
            }
            className="p-2 rounded-full hover:bg-muted select-none"
          >
            <Star
              size={16}
              className={
                file.isFavorite
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-muted-foreground"
              }
            />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShowDetails(createActionEvent(e));
            }}
            title={t("viewDetails")}
            aria-label={t("viewDetails")}
            className="p-2 rounded-full hover:bg-muted select-none"
          >
            <Info size={16} />
          </button>
        </div>
      )}

      {!isUploading && !isBulkMode && (
        <button
          onClick={handleMenuClick}
          className={cn(
            "md:hidden p-2.5 -m-1 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0 z-30 active:bg-accent active:text-primary pointer-events-auto select-none",
            view === "gallery"
              ? "absolute top-1 right-1 bg-background/70 backdrop-blur-sm shadow-sm border border-black/5"
              : "ml-auto",
          )}
          aria-label={t("moreOptions")}
        >
          <MoreVertical size={18} />
        </button>
      )}

      {isBulkMode && !isUploading && (
        <input
          type="checkbox"
          checked={isSelected}
          readOnly
          className={cn(
            "absolute h-5 w-5 pointer-events-auto z-10",
            view === "list"
              ? "right-4 top-1/2 -translate-y-1/2"
              : "top-2 right-2",
            "rounded border-primary text-primary focus:ring-primary accent-primary",
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleSelection(file);
          }}
        />
      )}
    </>
  );
};

export default FileItemActions;
