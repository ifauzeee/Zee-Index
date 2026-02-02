import type { DriveFile } from "@/lib/drive";
import React from "react";

export interface FileBrowserViewProps {
  files: DriveFile[];
  onItemClick: (file: DriveFile, e: React.MouseEvent) => void;
  onItemContextMenu: (
    event: { clientX: number; clientY: number },
    file: DriveFile,
  ) => void;
  activeFileId: string | null;
  focusedIndex?: number;
  onShareClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDetailsClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDownloadClick: (e: React.MouseEvent, file: DriveFile) => void;
  isAdmin: boolean;
  onDragStart: (e: React.DragEvent, file: DriveFile) => void;
  onFileDrop: (e: React.DragEvent, targetFolder: DriveFile) => void;
  onPrefetchItem?: (file: DriveFile) => void;
  onToggleFavorite?: (e: React.MouseEvent, file: DriveFile) => void;

  selectedFiles: DriveFile[];
  isBulkMode: boolean;
  shareLinks: any[];

  density?: "comfortable" | "compact";
}
