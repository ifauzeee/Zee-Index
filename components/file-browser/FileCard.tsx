import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Folder, MoreVertical, Loader2 } from "lucide-react";
import { formatBytes, getIcon, cn } from "@/lib/utils";
import type { DriveFile } from "@/lib/drive";
import { useAppStore } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

interface FileCardProps {
  file: DriveFile & {
    uploadProgress?: number;
    uploadStatus?: string;
    uploadError?: string;
  };
  onNavigate?: (folderId: string) => void;
  onClick?: (file: DriveFile) => void;
  onContextMenu?: (
    event: { clientX: number; clientY: number },
    file: DriveFile,
  ) => void;
  onShare?: (e: React.MouseEvent, file: DriveFile) => void;
  onDetails?: (e: React.MouseEvent, file: DriveFile) => void;
  onDownload?: (e: React.MouseEvent, file: DriveFile) => void;
  thumbnailSrc?: string;
  onMouseEnter?: () => void;
  isNavigating?: boolean;
  onPrefetchItem?: (file: DriveFile) => void;
}

export default function FileCard({
  file,
  onNavigate,
  onClick,
  onContextMenu,
  onShare,
  onDetails,
  onDownload,
  thumbnailSrc,
  onMouseEnter,
  isNavigating,
  onPrefetchItem,
}: FileCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onPrefetchItem || file.uploadStatus || !file.isFolder) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onPrefetchItem(file);
        }
      },
      { rootMargin: "200px" },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [file, onPrefetchItem]);
  const t = useTranslations("FileCard");
  const isFolder = file.mimeType === "application/vnd.google-apps.folder";
  const IconComponent = getIcon(file.mimeType);

  const { isBulkMode, selectedFiles, toggleSelection, setBulkMode } =
    useAppStore();
  const isSelected = selectedFiles.some((f) => f.id === file.id);

  const handleClick = (e: React.MouseEvent) => {
    if (isBulkMode || e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      toggleSelection(file);
      if (!isBulkMode) setBulkMode(true);
      return;
    }

    if (isFolder && onNavigate) {
      e.preventDefault();
      onNavigate(file.id);
    } else if (onClick) {
      onClick(file);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu({ clientX: e.clientX, clientY: e.clientY }, file);
    }
  };

  const displayThumbnail = thumbnailSrc && !isFolder && file.hasThumbnail;
  const isUploading = file.uploadStatus === "uploading";

  return (
    <div
      className={cn(
        "group relative border rounded-lg hover:shadow-md transition-all bg-card p-3 flex flex-col gap-3 h-[200px] cursor-pointer select-none",
        isSelected && "border-primary bg-primary/5 ring-1 ring-primary",
      )}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={onMouseEnter}
      ref={containerRef}
    >
      <div
        className="absolute top-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity data-[selected=true]:opacity-100"
        data-selected={isSelected}
      >
        <input
          type="checkbox"
          checked={isSelected}
          readOnly
          className="w-5 h-5 accent-primary rounded cursor-pointer"
        />
      </div>

      <div className="flex-1 w-full bg-muted/20 rounded flex items-center justify-center overflow-hidden relative">
        {isNavigating ? (
          <div className="flex flex-col items-center justify-center gap-2 text-primary">
            <Loader2 className="w-12 h-12 animate-spin" />
          </div>
        ) : isUploading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">{file.uploadProgress || 0}%</span>
          </div>
        ) : displayThumbnail ? (
          <Image
            src={thumbnailSrc}
            alt={file.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
            onError={() => {}}
          />
        ) : isFolder ? (
          <Folder className="w-16 h-16 text-blue-500/80" />
        ) : (
          <IconComponent className="w-16 h-16 text-muted-foreground" />
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate" title={file.name}>
            {isFolder ? (
              <Link
                href={`/folder/${file.id}`}
                className="hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onNavigate) onNavigate(file.id);
                }}
              >
                {file.name}
              </Link>
            ) : (
              file.name
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isFolder ? t("folder") : formatBytes(parseInt(file.size || "0"))}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {onDetails && (
              <DropdownMenuItem onClick={(e) => onDetails(e as any, file)}>
                {t("info")}
              </DropdownMenuItem>
            )}
            {onDownload && !isFolder && (
              <DropdownMenuItem onClick={(e) => onDownload(e as any, file)}>
                {t("download")}
              </DropdownMenuItem>
            )}
            {onShare && (
              <DropdownMenuItem onClick={(e) => onShare(e as any, file)}>
                {t("share")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red-600">
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
