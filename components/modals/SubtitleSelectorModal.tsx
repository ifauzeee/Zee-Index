"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { type DriveFile } from "@/lib/drive";
import { FileText, Loader2, Music, Check } from "lucide-react";
import { useTranslations } from "next-intl";

interface SubtitleTrack {
  kind: string;
  src: string;
  srcLang: string;
  label: string;
  default: boolean;
}

interface SubtitleSelectorModalProps {
  folderId: string;
  onSelect: (track: SubtitleTrack) => void;
  onClose: () => void;
  existingTracks: SubtitleTrack[];
}

export default function SubtitleSelectorModal({
  folderId,
  onSelect,
  onClose,
  existingTracks,
}: SubtitleSelectorModalProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations("SubtitleSelector");

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch(`/api/files?folderId=${folderId}`);
        if (res.ok) {
          const data = await res.json();
          const subFiles = (data.files || []).filter((f: DriveFile) => {
            const ext = f.name.toLowerCase().split(".").pop();
            return ext === "vtt" || ext === "srt";
          });
          setFiles(subFiles);
        }
      } catch (error) {
        console.error("Failed to fetch subtitle files", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [folderId]);

  const handleSelect = (file: DriveFile) => {
    const langMatch = file.name.match(/[\._]([a-z]{2,3})[\._]/i);
    const lang = langMatch ? langMatch[1] : "en";
    const label = file.name;

    onSelect({
      src: `/api/download?fileId=${file.id}`,
      kind: "subtitles",
      srcLang: lang,
      label: label,
      default: existingTracks.length === 0,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <Music className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="text-muted-foreground">{t("noFiles")}</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {files.map((file) => {
                const isSelected = existingTracks.some((t) =>
                  t.src.includes(file.id),
                );
                return (
                  <button
                    key={file.id}
                    onClick={() => !isSelected && handleSelect(file)}
                    disabled={isSelected}
                    className={`flex items-center gap-3 p-3 text-left rounded-lg transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary cursor-default"
                        : "bg-secondary/50 hover:bg-secondary text-foreground"
                    }`}
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-background rounded-md shrink-0">
                      <FileText size={20} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.mimeType}
                      </p>
                    </div>
                    {isSelected && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
