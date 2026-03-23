import type { DriveFile } from "@/lib/drive";
import type { ShareLink, UploadItem } from "@/lib/store";
import React from "react";

export type FileBrowserActionEvent = Pick<
  React.MouseEvent,
  "preventDefault" | "stopPropagation" | "shiftKey"
>;

export type BrowserFile = DriveFile & {
  isFavorite?: boolean;
  uploadProgress?: UploadItem["progress"];
  uploadStatus?: UploadItem["status"];
  uploadError?: UploadItem["error"];
};

export interface FileBrowserViewProps {
  files: BrowserFile[];
  onItemClick: (file: BrowserFile, e: FileBrowserActionEvent) => void;
  onItemContextMenu: (
    event: { clientX: number; clientY: number },
    file: BrowserFile,
  ) => void;
  activeFileId: string | null;
  focusedIndex?: number;
  onShareClick: (e: FileBrowserActionEvent, file: BrowserFile) => void;
  onDetailsClick: (e: FileBrowserActionEvent, file: BrowserFile) => void;
  onDownloadClick: (e: FileBrowserActionEvent, file: BrowserFile) => void;
  isAdmin: boolean;
  onDragStart: (e: React.DragEvent, file: BrowserFile) => void;
  onFileDrop: (e: React.DragEvent, targetFolder: BrowserFile) => void;
  onPrefetchItem?: (file: BrowserFile) => void;
  onToggleFavorite?: (e: FileBrowserActionEvent, file: BrowserFile) => void;

  selectedFiles: DriveFile[];
  isBulkMode: boolean;
  shareLinks: ShareLink[];

  density?: "comfortable" | "compact";
  isFetchingNextPage?: boolean;
  nextPageToken?: string | null;
  navigatingId: string | null;
}
