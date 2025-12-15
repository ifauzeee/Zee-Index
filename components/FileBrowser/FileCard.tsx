import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Folder, MoreVertical } from "lucide-react";
import { formatBytes, getIcon } from "@/lib/utils";
import type { DriveFile } from "@/lib/googleDrive";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
}: FileCardProps) {
  const isFolder = file.mimeType === "application/vnd.google-apps.folder";
  const IconComponent = getIcon(file.mimeType);

  const handleClick = (e: React.MouseEvent) => {
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
      className="group relative border rounded-lg hover:shadow-md transition-all bg-card p-3 flex flex-col gap-3 h-[200px] cursor-pointer"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="flex-1 w-full bg-muted/20 rounded flex items-center justify-center overflow-hidden relative">
        {isUploading ? (
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
            {isFolder ? "Folder" : formatBytes(parseInt(file.size || "0"))}
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
                Info
              </DropdownMenuItem>
            )}
            {onDownload && !isFolder && (
              <DropdownMenuItem onClick={(e) => onDownload(e as any, file)}>
                Download
              </DropdownMenuItem>
            )}
            {onShare && (
              <DropdownMenuItem onClick={(e) => onShare(e as any, file)}>
                Share
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
