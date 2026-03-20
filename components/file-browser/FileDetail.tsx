"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Save,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Info,
  X,
  Maximize2,
} from "lucide-react";

import { useAppStore } from "@/lib/store";
import type { DriveFile } from "@/lib/drive";
import { getFileType, cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { fetchFolderPathApi } from "@/hooks/useFileFetching";

import ShareButton from "@/components/file-browser/ShareButton";
import InfoPanel from "../file-details/InfoPanel";
import {
  ImagePreview,
  GoogleDrivePreview,
  EbookPreview,
  CodePreview,
  DefaultPreview,
  LoadingPreview,
  FileIconPlaceholder,
} from "../file-details/PreviewRenderers";
import RichMediaMetadata from "../file-details/RichMediaMetadata";

const VideoPlayer = dynamic(() => import("../file-details/VideoPlayer"), {
  loading: () => <LoadingPreview />,
});

const MarkdownViewer = dynamic(() => import("../file-details/MarkdownViewer"), {
  loading: () => <LoadingPreview />,
});

const AudioPlayer = dynamic(() => import("../file-details/AudioPlayer"), {
  loading: () => <LoadingPreview />,
});

const ArchivePreviewModal = dynamic(
  () => import("@/components/modals/ArchivePreviewModal"),
);
const ImageEditorModal = dynamic(
  () => import("@/components/modals/ImageEditorModal"),
);
const FileRevisionsModal = dynamic(
  () => import("@/components/modals/FileRevisionsModal"),
);

interface SubtitleTrack {
  kind: string;
  src: string;
  srcLang: string;
  label: string;
  default: boolean;
}

export default function FileDetail({
  file,
  isModal = false,
  prevFileUrl,
  nextFileUrl,
  subtitleTracks,
  currentFolderId,
  onCloseModal,
}: {
  file: DriveFile;
  isModal?: boolean;
  prevFileUrl?: string;
  nextFileUrl?: string;
  subtitleTracks?: SubtitleTrack[];
  currentFolderId?: string;
  onAddSubtitle?: (track: SubtitleTrack) => void;
  onRemoveSubtitle?: (src: string) => void;
  onCloseModal?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const addToast = useAppStore((state) => state.addToast);
  const user = useAppStore((state) => state.user);
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);
  const hideAuthor = useAppStore((state) => state.hideAuthor);
  const fileTags = useAppStore((state) => state.fileTags);
  const fetchTags = useAppStore((state) => state.fetchTags);
  const addTag = useAppStore((state) => state.addTag);
  const removeTag = useAppStore((state) => state.removeTag);
  const folderTokens = useAppStore((state) => state.folderTokens);
  const setCurrentFileId = useAppStore((state) => state.setCurrentFileId);
  const setCurrentFolderId = useAppStore((state) => state.setCurrentFolderId);
  const isTheaterMode = useAppStore((state) => state.isTheaterMode);
  const sharePolicy = useAppStore((state) => state.sharePolicy);

  const [internalPreviewOpen, setInternalPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [editableContent, setEditableContent] = useState<string | null>(null);
  const [isFetchingEditableContent, setIsFetchingEditableContent] =
    useState(false);

  const [showTextPreview, setShowTextPreview] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [showArchivePreview, setShowArchivePreview] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [activeSubtitleTracks, setActiveSubtitleTracks] = useState<
    SubtitleTrack[]
  >(subtitleTracks || []);
  const [tmdbGenres, setTmdbGenres] = useState<string[]>([]);

  const t = useTranslations("FileDetail");
  const locale = useLocale();

  useEffect(() => {
    fetchTags(file.id);
  }, [file.id, fetchTags]);

  useEffect(() => {
    if (!isModal) {
      setCurrentFileId(file.id);
      if (currentFolderId) {
        setCurrentFolderId(currentFolderId);
      }
    }
  }, [file.id, currentFolderId, isModal, setCurrentFileId, setCurrentFolderId]);

  const handleAddSubtitle = (track: SubtitleTrack) => {
    setActiveSubtitleTracks((prev) => {
      if (prev.find((t) => t.src === track.src || t.label === track.label))
        return prev;
      return [...prev, track];
    });
  };

  const handleRemoveSubtitle = (src: string) => {
    setActiveSubtitleTracks((prev) => prev.filter((t) => t.src !== src));
  };

  const handleMetadataLoaded = React.useCallback((data: any) => {
    setTmdbGenres(data?.genres?.map((g: any) => g.name) || []);
  }, []);

  const shareToken = useMemo(
    () => searchParams.get("share_token"),
    [searchParams],
  );
  const isAdmin = user?.role === "ADMIN" || session?.user?.role === "ADMIN";
  const canShowAuthor = isAdmin || !hideAuthor;
  const fileType = getFileType(file);
  const { data: folderPathData } = useQuery({
    queryKey: ["folderPath", currentFolderId, shareToken, locale],
    queryFn: () => fetchFolderPathApi(currentFolderId!, shareToken, locale),
    enabled: !!currentFolderId,
    staleTime: 1000 * 60 * 5,
  });

  const bestToken = useMemo(() => {
    const parentId = file.parents?.[0];
    if (parentId && folderTokens[parentId]) return folderTokens[parentId];

    if (currentFolderId && folderTokens[currentFolderId])
      return folderTokens[currentFolderId];

    const path = Array.isArray(folderPathData) ? folderPathData : [];
    const found = [...path].reverse().find((f) => folderTokens[f.id]);
    return found ? folderTokens[found.id] : null;
  }, [file.parents, currentFolderId, folderTokens, folderPathData]);

  const directLink = useMemo(() => {
    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) {
      url += `&share_token=${shareToken}`;
    }
    if (bestToken) {
      url += `&access_token=${bestToken}`;
    }
    return url;
  }, [file.id, shareToken, bestToken]);

  const authenticatedSubtitleTracks = useMemo(() => {
    if (!bestToken) return activeSubtitleTracks;

    return activeSubtitleTracks.map((t) => {
      if (t.src.includes("access_token=")) return t;
      const separator = t.src.includes("?") ? "&" : "?";
      return {
        ...t,
        src: `${t.src}${separator}access_token=${bestToken}`,
      };
    });
  }, [activeSubtitleTracks, bestToken]);

  const ARCHIVE_PREVIEW_LIMIT = 100 * 1024 * 1024;
  const isArchivePreviewable =
    fileType === "archive" &&
    parseInt(file.size || "0", 10) <= ARCHIVE_PREVIEW_LIMIT;

  const isEditable =
    isAdmin &&
    (fileType === "code" || fileType === "markdown" || fileType === "text");
  const isDocPreviewable = fileType === "office" || fileType === "pdf";
  const isTextPreviewable =
    fileType === "code" || fileType === "markdown" || fileType === "text";
  const isPreviewable = [
    "audio",
    "video",
    "image",
    "pdf",
    "office",
    "ebook",
    "code",
    "text",
    "markdown",
  ].includes(fileType);

  useEffect(() => {
    setInternalPreviewOpen(false);
    setShowDocPreview(false);
    setShowTextPreview(false);
  }, [file.id]);

  useEffect(() => {
    if (isModal || internalPreviewOpen) {
      if (isDocPreviewable) setShowDocPreview(true);
      if (isTextPreviewable) setShowTextPreview(true);
    }
  }, [isModal, internalPreviewOpen, isDocPreviewable, isTextPreviewable]);

  useEffect(() => {
    const shouldFetch =
      (isEditing && isEditable && !editableContent) ||
      (!isEditing && showTextPreview && !textContent);

    if (shouldFetch) {
      setIsFetchingEditableContent(true);
      fetch(directLink)
        .then((res) => (res.ok ? res.text() : Promise.reject("Fail")))
        .then((text) => {
          if (isEditing) setEditableContent(text);
          else setTextContent(text);
        })
        .finally(() => setIsFetchingEditableContent(false));
    }
  }, [
    isEditing,
    isEditable,
    editableContent,
    directLink,
    showTextPreview,
    textContent,
  ]);

  const handleSaveChanges = async () => {
    if (editableContent === null) return;
    setIsSaving(true);
    try {
      await fetch("/api/files/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, newContent: editableContent }),
      });
      addToast({ message: t("saved"), type: "success" });
      setIsEditing(false);
      triggerRefresh();
      if (["markdown", "text"].includes(fileType))
        setTextContent(editableContent);
    } catch {
      addToast({ message: t("saveFailed"), type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}${directLink}`);
    addToast({ message: t("linkCopied"), type: "success" });
  };

  const renderPreviewContent = () => {
    let content;
    switch (fileType) {
      case "video":
        content = (
          <VideoPlayer
            src={directLink}
            title={file.name}
            type="video"
            poster={file.thumbnailLink}
            mimeType={file.mimeType}
            webViewLink={file.webViewLink}
            subtitleTracks={authenticatedSubtitleTracks}
            onEnded={() => nextFileUrl && router.push(nextFileUrl)}
          />
        );
        break;
      case "audio":
        content = (
          <AudioPlayer
            src={directLink}
            title={file.name}
            mimeType={file.mimeType}
            poster={file.thumbnailLink}
          />
        );
        break;
      case "image":
        content = <ImagePreview src={directLink} />;
        break;
      case "office":
      case "pdf":
        break;
      case "ebook":
        content = <EbookPreview src={directLink} />;
        break;
      case "markdown":
        if (showTextPreview && textContent) {
          content = (
            <div className="w-full h-full overflow-y-auto">
              <MarkdownViewer content={textContent} />
            </div>
          );
        }
        break;
      case "text":
      case "code":
        if (showTextPreview)
          content = <CodePreview src={directLink} fileName={file.name} />;
        break;
    }

    if (!content) {
      content = (
        <DefaultPreview
          mimeType={file.mimeType}
          fileName={file.name}
          downloadUrl={directLink}
        />
      );
    }

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {content}
        {sharePolicy?.hasWatermark &&
          fileType !== "video" &&
          fileType !== "pdf" && (
            <div className="absolute inset-0 pointer-events-none z-[90] overflow-hidden flex flex-wrap justify-around items-center opacity-[0.25] mix-blend-difference w-full h-full select-none text-white/80">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="text-xl sm:text-3xl font-black -rotate-[30deg] p-6 sm:p-10 whitespace-nowrap drop-shadow-md"
                >
                  {sharePolicy?.watermarkText ||
                    user?.email ||
                    user?.name ||
                    "Confidential View"}
                  <br />
                  <span className="text-sm sm:text-lg opacity-80">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
      </div>
    );
  };

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white h-full w-full animate-in fade-in">
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-between p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <button
            onClick={onCloseModal}
            className="pointer-events-auto p-2 bg-black/40 rounded-full hover:bg-white/20"
          >
            <X size={20} />
          </button>
          <div className="flex gap-3 pointer-events-auto">
            {isTextPreviewable && !showTextPreview && (
              <button
                onClick={() => setShowTextPreview(true)}
                className="p-2 bg-black/40 rounded-full"
              >
                <Eye size={20} />
              </button>
            )}
            {isDocPreviewable && !showDocPreview && (
              <button
                onClick={() => setShowDocPreview(true)}
                className="p-2 bg-black/40 rounded-full"
              >
                <FileText size={20} />
              </button>
            )}
            <button
              onClick={() => setShowMobileInfo(true)}
              className="p-2 bg-black/40 rounded-full hover:bg-white/20"
            >
              <Info size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 relative flex items-center justify-center w-full h-full">
          {prevFileUrl && (
            <Link
              href={prevFileUrl}
              className="absolute left-2 md:left-4 z-10 p-3 bg-black/30 backdrop-blur-sm rounded-full hover:bg-white/20"
            >
              <ChevronLeft size={24} />
            </Link>
          )}
          <div className="w-full h-full flex items-center justify-center">
            {renderPreviewContent()}
          </div>
          {nextFileUrl && (
            <Link
              href={nextFileUrl}
              className="absolute right-2 md:right-4 z-10 p-3 bg-black/30 backdrop-blur-sm rounded-full hover:bg-white/20"
            >
              <ChevronRight size={24} />
            </Link>
          )}
        </div>

        <AnimatePresence>
          {showMobileInfo && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-30"
                onClick={() => setShowMobileInfo(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="fixed bottom-0 z-40 w-full bg-zinc-900 rounded-t-2xl max-h-[80vh] overflow-y-auto p-4"
              >
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-6" />
                <InfoPanel
                  file={file}
                  isAdmin={isAdmin}
                  canShowAuthor={canShowAuthor}
                  tags={fileTags[file.id] || []}
                  directLink={directLink}
                  onAddTag={(tag) => addTag(file.id, tag)}
                  onRemoveTag={(tag) => removeTag(file.id, tag)}
                  onCopyLink={handleCopyLink}
                  isImage={fileType === "image"}
                  subtitleTracks={authenticatedSubtitleTracks}
                  onAddSubtitle={handleAddSubtitle}
                  onRemoveSubtitle={handleRemoveSubtitle}
                  tmdbGenres={tmdbGenres}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const showShareButton = !shareToken && isAdmin;

  return (
    <div
      className={cn(
        "container mx-auto px-4 py-6 flex flex-col h-full",
        isTheaterMode ? "max-w-none" : "overflow-hidden",
      )}
    >
      {!isTheaterMode && (
        <header className="flex items-center justify-between gap-4 mb-4 animate-in fade-in slide-in-from-top-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={20} /> {t("back")}
          </button>
          {showShareButton && (
            <ShareButton
              path={`/folder/${file.parents?.[0]}/file/${file.id}/${encodeURIComponent(file.name)}`}
              itemName={file.name}
            />
          )}
        </header>
      )}

      <div
        className={cn(
          "grid grid-cols-1 lg:gap-12 flex-1 min-h-0",
          isTheaterMode ? "lg:grid-cols-1" : "lg:grid-cols-3 overflow-hidden",
        )}
      >
        <div
          className={cn(
            "flex flex-col flex-1 min-h-0 relative group transition-all duration-500",
            isTheaterMode
              ? "lg:col-span-1 h-[70vh] md:h-[85vh]"
              : "lg:col-span-2",
          )}
        >
          {isEditable && !isTheaterMode && (
            <div className="mb-2 flex justify-end gap-2">
              {isEditing && (
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded flex items-center gap-2"
                >
                  <Save size={16} /> {isSaving ? t("saving") : t("save")}
                </button>
              )}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-1 bg-secondary rounded"
              >
                {isEditing ? t("cancel") : t("editFile")}
              </button>
            </div>
          )}

          <div
            className={cn(
              "w-full flex-1 flex items-start justify-center overflow-hidden",
              !isEditing && fileType !== "image" && "bg-background rounded-lg",
            )}
          >
            {isEditing ? (
              isFetchingEditableContent ? (
                <LoadingPreview />
              ) : (
                <textarea
                  value={editableContent || ""}
                  onChange={(e) => setEditableContent(e.target.value)}
                  className="w-full h-full p-4 bg-background font-mono text-sm resize-none focus:outline-none border rounded-lg"
                  spellCheck="false"
                />
              )
            ) : fileType === "video" ? (
              <div className="w-full h-full bg-black rounded-xl overflow-hidden flex items-center justify-center shadow-2xl ring-1 ring-white/10">
                {!internalPreviewOpen && (
                  <VideoPlayer
                    src={directLink}
                    title={file.name}
                    type="video"
                    poster={file.thumbnailLink}
                    mimeType={file.mimeType}
                    webViewLink={file.webViewLink}
                    subtitleTracks={authenticatedSubtitleTracks}
                    onEnded={() => nextFileUrl && router.push(nextFileUrl)}
                  />
                )}
              </div>
            ) : fileType === "image" ? (
              <div
                className="w-full h-full relative cursor-zoom-in group/image flex items-center justify-center"
                onClick={() => setInternalPreviewOpen(true)}
              >
                <ImagePreview src={directLink} />
                <div className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity">
                  <Maximize2 size={20} />
                </div>
              </div>
            ) : (
              <FileIconPlaceholder
                mimeType={file.mimeType}
                onPreview={() => setInternalPreviewOpen(true)}
                isPreviewable={isPreviewable}
              />
            )}
          </div>

          {!isEditing && (
            <>
              {prevFileUrl && (
                <Link
                  href={prevFileUrl}
                  className="absolute left-0 top-1/2 p-2 bg-background/50 rounded-full opacity-0 group-hover:opacity-100 transition"
                >
                  <ChevronLeft size={28} />
                </Link>
              )}
              {nextFileUrl && (
                <Link
                  href={nextFileUrl}
                  className="absolute right-0 top-1/2 p-2 bg-background/50 rounded-full opacity-0 group-hover:opacity-100 transition"
                >
                  <ChevronRight size={28} />
                </Link>
              )}
            </>
          )}
        </div>

        {!isTheaterMode && (
          <InfoPanel
            file={file}
            isAdmin={isAdmin}
            canShowAuthor={canShowAuthor}
            tags={fileTags[file.id] || []}
            directLink={directLink}
            onAddTag={(tag) => addTag(file.id, tag)}
            onRemoveTag={(tag) => removeTag(file.id, tag)}
            onCopyLink={handleCopyLink}
            onEditImage={() => setShowImageEditor(true)}
            onShowHistory={() => setShowHistory(true)}
            isImage={fileType === "image"}
            subtitleTracks={authenticatedSubtitleTracks}
            onAddSubtitle={handleAddSubtitle}
            onRemoveSubtitle={handleRemoveSubtitle}
            tmdbGenres={tmdbGenres}
          />
        )}
      </div>

      {fileType === "video" && !isTheaterMode && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
          <RichMediaMetadata
            filename={file.name}
            onMetadataLoaded={handleMetadataLoaded}
          />
        </div>
      )}

      {internalPreviewOpen && (
        <FileDetail
          file={file}
          isModal={true}
          onCloseModal={() => setInternalPreviewOpen(false)}
          prevFileUrl={prevFileUrl}
          nextFileUrl={nextFileUrl}
          subtitleTracks={authenticatedSubtitleTracks}
          currentFolderId={currentFolderId}
          onAddSubtitle={handleAddSubtitle}
          onRemoveSubtitle={handleRemoveSubtitle}
        />
      )}
      {showArchivePreview && isArchivePreviewable && (
        <ArchivePreviewModal
          file={file}
          onClose={() => setShowArchivePreview(false)}
        />
      )}
      {showImageEditor && (
        <ImageEditorModal
          file={file}
          onClose={() => setShowImageEditor(false)}
        />
      )}
      {showHistory && (
        <FileRevisionsModal
          fileId={file.id}
          fileName={file.name}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
