"use client";

import React, { useState } from "react";
import { formatBytes, formatDuration } from "@/lib/utils";
import type { DriveFile } from "@/lib/drive";
import {
  Plus,
  X,
  Download,
  Link as LinkIcon,
  History as HistoryIcon,
  Edit,
  Subtitles,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import SubtitleSelectorModal from "../modals/SubtitleSelectorModal";
import { srtToVtt } from "@/lib/subtitleUtils";

interface InfoPanelProps {
  file: DriveFile;
  isAdmin: boolean;
  canShowAuthor: boolean;
  tags: string[];
  directLink: string;
  onAddTag: (tag: string) => Promise<void>;
  onRemoveTag: (tag: string) => void;
  onCopyLink: () => void;
  onEditImage?: () => void;
  onShowHistory?: () => void;
  isImage: boolean;
  subtitleTracks?: any[];
  onAddSubtitle?: (track: any) => void;
  onRemoveSubtitle?: (src: string) => void;
}

const ListItem = ({ label, value }: { label: string; value: string }) => (
  <li className="flex justify-between items-start gap-4">
    <span className="font-medium text-muted-foreground">{label}</span>
    <span className="text-right break-all">{value}</span>
  </li>
);

export default function InfoPanel({
  file,
  isAdmin,
  canShowAuthor,
  tags,
  directLink,
  onAddTag,
  onRemoveTag,
  onCopyLink,
  onEditImage,
  onShowHistory,
  isImage,
  subtitleTracks = [],
  onAddSubtitle,
  onRemoveSubtitle,
}: InfoPanelProps) {
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isShowingSubtitleSelector, setIsShowingSubtitleSelector] =
    useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const t = useTranslations("InfoPanel");
  const format = useFormatter();

  const metadata = file.imageMediaMetadata || file.videoMediaMetadata;
  const durationMillis = file.videoMediaMetadata?.durationMillis
    ? parseInt(file.videoMediaMetadata.durationMillis, 10)
    : undefined;

  const handleSubmitTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    setIsAddingTag(true);
    await onAddTag(newTag.trim());
    setNewTag("");
    setIsAddingTag(false);
  };

  const handleLocalSubtitleUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        let finalContent = content;
        if (!content.trim().startsWith("WEBVTT")) {
          finalContent = srtToVtt(content);
        }
        const blob = new Blob([finalContent], { type: "text/vtt" });
        const url = URL.createObjectURL(blob);

        onAddSubtitle?.({
          src: url,
          kind: "subtitles",
          srcLang: "local",
          label: `Local: ${file.name.replace(".srt", ".vtt")}`,
          default: true,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const [pathString, setPathString] = useState<string>("/");
  const [pathLoading, setPathLoading] = useState(false);

  React.useEffect(() => {
    const fetchPath = async () => {
      if (!file.parents || file.parents.length === 0) {
        setPathString("Root");
        return;
      }

      setPathLoading(true);
      try {
        const parentId = file.parents[0];
        const res = await fetch(`/api/folderpath?folderId=${parentId}`);
        if (res.ok) {
          const data = await res.json();
          const path = data.map((p: any) => p.name).join(" / ");
          setPathString(path || "Root");
        } else {
          setPathString("Unknown");
        }
      } catch (error) {
        console.error("Failed to fetch path", error);
        setPathString(t("error"));
      } finally {
        setPathLoading(false);
      }
    };

    fetchPath();
  }, [file.id, file.parents, t]);

  return (
    <div className="mt-8 lg:mt-0 lg:col-span-1 lg:overflow-y-auto">
      <h1 className="text-2xl lg:text-3xl font-bold break-words mb-6">
        {file.name}
      </h1>

      {isAdmin && (
        <div className="flex gap-2 mb-6">
          {isImage && onEditImage && (
            <button
              onClick={onEditImage}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Edit size={16} /> {t("editImage")}
            </button>
          )}
          {onShowHistory && (
            <button
              onClick={onShowHistory}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <HistoryIcon size={16} /> {t("history")}
            </button>
          )}
        </div>
      )}

      <h3 className="text-lg font-semibold mb-4 border-b pb-2">
        {t("fileInfo")}
      </h3>
      <ul className="space-y-3 text-sm text-foreground">
        <ListItem
          label={t("size")}
          value={file.size ? formatBytes(Number(file.size)) : "-"}
        />
        <ListItem
          label={t("location")}
          value={pathLoading ? t("loading") : pathString}
        />
        <ListItem label={t("type")} value={file.mimeType} />
        {metadata?.width && metadata?.height && (
          <ListItem
            label={t("dimensions")}
            value={`${metadata.width} x ${metadata.height} px`}
          />
        )}
        {durationMillis && (
          <ListItem
            label={t("duration")}
            value={formatDuration(durationMillis / 1000)}
          />
        )}
        <ListItem
          label={t("modified")}
          value={format.dateTime(new Date(file.modifiedTime), {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
          })}
        />
        {canShowAuthor && file.owners && (
          <ListItem label={t("owner")} value={file.owners[0].displayName} />
        )}
      </ul>

      <div className="mt-6 pt-4 border-t">
        <h4 className="text-sm font-bold text-muted-foreground uppercase mb-2">
          {t("tags")}
        </h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {tags?.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-secondary rounded text-xs flex items-center gap-1 font-medium"
            >
              {tag}
              {isAdmin && (
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="hover:text-destructive transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
          {tags.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              {t("noTags")}
            </p>
          )}
        </div>

        {isAdmin && (
          <form onSubmit={handleSubmitTag} className="flex gap-2">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder={t("addTag")}
              className="flex-1 px-3 py-1.5 bg-background border rounded text-sm focus:ring-1 focus:ring-primary outline-none"
            />
            <button
              type="submit"
              disabled={isAddingTag || !newTag.trim()}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
          </form>
        )}
      </div>

      {file.mimeType.startsWith("video/") && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-muted-foreground uppercase">
              {t("subtitles")}
            </h4>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".srt,.vtt"
                onChange={handleLocalSubtitleUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 bg-secondary/80 hover:bg-secondary text-xs font-semibold rounded-md flex items-center gap-1 transition-colors"
                title={t("addLocalSubtitle")}
              >
                <Upload size={14} />
              </button>
              <button
                onClick={() => setIsShowingSubtitleSelector(true)}
                className="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-md flex items-center gap-1 transition-colors"
                title={t("addSubtitle")}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {subtitleTracks.map((track) => (
              <div
                key={track.src}
                className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Subtitles
                    size={14}
                    className="text-muted-foreground shrink-0"
                  />
                  <span className="truncate font-medium">{track.label}</span>
                  <span className="text-[10px] uppercase bg-background px-1 rounded text-muted-foreground">
                    {track.srcLang}
                  </span>
                </div>
                <button
                  onClick={() => onRemoveSubtitle?.(track.src)}
                  className="p-1 hover:text-destructive transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {subtitleTracks.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                {t("noSubtitles")}
              </p>
            )}
          </div>
        </div>
      )}

      {isShowingSubtitleSelector && file.parents && (
        <SubtitleSelectorModal
          folderId={file.parents[0]}
          existingTracks={subtitleTracks}
          onSelect={(track) => onAddSubtitle?.(track)}
          onClose={() => setIsShowingSubtitleSelector(false)}
        />
      )}

      <div className="grid grid-cols-2 gap-3 mt-8">
        <button
          onClick={onCopyLink}
          className="flex items-center justify-center px-4 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-semibold transition-colors"
        >
          <LinkIcon size={18} className="mr-3" />
          {t("copyLink")}
        </button>

        <a
          href={directLink}
          download
          className="flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold"
        >
          <Download size={18} className="mr-3" />
          {t("download")}
        </a>
      </div>
    </div>
  );
}
