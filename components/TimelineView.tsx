"use client";

import React, { useMemo } from "react";
import type { DriveFile } from "@/lib/googleDrive";
import FileCard from "./FileBrowser/FileCard";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { useAppStore } from "@/lib/store";
import { Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

interface TimelineViewProps {
  files: DriveFile[];
  onItemClick: (file: DriveFile) => void;
  onItemContextMenu: (
    event: { clientX: number; clientY: number },
    file: DriveFile,
  ) => void;
  onShareClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDetailsClick: (e: React.MouseEvent, file: DriveFile) => void;
  onDownloadClick: (e: React.MouseEvent, file: DriveFile) => void;
  onNavigate: (folderId: string) => void;
}

export default function TimelineView({
  files,
  onItemClick,
  onItemContextMenu,
  onShareClick,
  onDetailsClick,
  onDownloadClick,
  onNavigate,
}: TimelineViewProps) {
  const { shareToken, folderTokens } = useAppStore();
  const t = useTranslations("TimelineView");

  const getThumbnailSrc = (file: DriveFile) => {
    if (file.thumbnailLink) {
      return file.thumbnailLink.replace(/=s\d+/, `=s320`);
    }
    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) {
      url += `&share_token=${shareToken}`;
    }
    const parentId = file.parents?.[0];
    if (parentId && folderTokens[parentId]) {
      url += `&access_token=${folderTokens[parentId]}`;
    }
    return url;
  };

  const groupedFiles = useMemo(() => {
    const mediaFiles = files.filter((f) => {
      const mime = f.mimeType || "";
      return mime.startsWith("image/") || mime.startsWith("video/");
    });

    mediaFiles.sort((a, b) => {
      const dateA = new Date(a.createdTime).getTime();
      const dateB = new Date(b.createdTime).getTime();
      return dateB - dateA;
    });

    const groups: Record<string, DriveFile[]> = {};
    mediaFiles.forEach((file) => {
      try {
        const date = parseISO(file.createdTime);
        const key = format(date, "MMMM yyyy", { locale: id });
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(file);
      } catch {
        const key = "Unknown Date";
        if (!groups[key]) groups[key] = [];
        groups[key].push(file);
      }
    });

    return groups;
  }, [files]);

  if (Object.keys(groupedFiles).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Calendar className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">{t("noMediaFound")}</p>
        <p className="text-sm">{t("uploadMediaHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedFiles).map(([dateGroup, groupFiles]) => (
        <div key={dateGroup} className="space-y-4">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 border-b border-border/50">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              {dateGroup}
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {groupFiles.length}
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {groupFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onNavigate={onNavigate}
                onClick={onItemClick}
                onContextMenu={(e) => onItemContextMenu(e, file)}
                onShare={onShareClick}
                onDetails={onDetailsClick}
                onDownload={onDownloadClick}
                thumbnailSrc={getThumbnailSrc(file)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
