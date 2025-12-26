"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
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
import type { DriveFile } from "@/lib/googleDrive";
import { getFileType, cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

import ShareButton from "./ShareButton";
import ArchivePreviewModal from "./ArchivePreviewModal";
import ImageEditorModal from "./ImageEditorModal";
import FileRevisionsModal from "./FileRevisionsModal";
import VideoPlayer from "./file-details/VideoPlayer";
import InfoPanel from "./file-details/InfoPanel";
import {
  ImagePreview,
  GoogleDrivePreview,
  EbookPreview,
  CodePreview,
  DefaultPreview,
  LoadingPreview,
  FileIconPlaceholder,
} from "./file-details/PreviewRenderers";

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
  onCloseModal,
}: {
  file: DriveFile;
  isModal?: boolean;
  prevFileUrl?: string;
  nextFileUrl?: string;
  subtitleTracks?: SubtitleTrack[];
  onCloseModal?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const {
    addToast,
    user,
    triggerRefresh,
    hideAuthor,
    fileTags,
    fetchTags,
    addTag,
    removeTag,
    folderTokens,
  } = useAppStore();

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

  const shareToken = useMemo(
    () => searchParams.get("share_token"),
    [searchParams],
  );
  const isAdmin = user?.role === "ADMIN" || session?.user?.role === "ADMIN";
  const canShowAuthor = isAdmin || !hideAuthor;
  const fileType = getFileType(file);

  const directLink = useMemo(() => {
    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) {
      url += `&share_token=${shareToken}`;
    }
    const parentId = file.parents?.[0];
    if (parentId && folderTokens[parentId]) {
      url += `&access_token=${folderTokens[parentId]}`;
    }
    return url;
  }, [file.id, shareToken, file.parents, folderTokens]);

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
  const t = useTranslations("FileDetail");

  useEffect(() => {
    fetchTags(file.id);
  }, [file.id, fetchTags]);

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
      await fetch("/api/file/update", {
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
    switch (fileType) {
      case "video":
        return (
          <VideoPlayer
            src={directLink}
            title={file.name}
            type="video"
            poster={file.thumbnailLink}
            mimeType={file.mimeType}
            webViewLink={file.webViewLink}
            subtitleTracks={subtitleTracks}
            onEnded={() => nextFileUrl && router.push(nextFileUrl)}
          />
        );
      case "audio":
        return (
          <VideoPlayer
            src={directLink}
            title={file.name}
            type="audio"
            mimeType={file.mimeType}
          />
        );
      case "image":
        return <ImagePreview src={directLink} />;
      case "office":
      case "pdf":
        if (showDocPreview) return <GoogleDrivePreview fileId={file.id} />;
        break;
      case "ebook":
        return <EbookPreview src={directLink} />;
      case "markdown":
      case "text":
        if (showTextPreview && textContent) {
          if (fileType === "markdown") {
            return (
              <div className="prose dark:prose-invert prose-sm w-full h-full overflow-y-auto p-4 md:p-8 bg-background">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                >
                  {textContent}
                </ReactMarkdown>
              </div>
            );
          }
          return (
            <div className="w-full h-full overflow-y-auto p-4 bg-background">
              <pre className="font-mono text-sm">{textContent}</pre>
            </div>
          );
        }
        break;
      case "code":
        if (showTextPreview)
          return <CodePreview src={directLink} fileName={file.name} />;
        break;
    }
    return (
      <DefaultPreview
        mimeType={file.mimeType}
        fileName={file.name}
        downloadUrl={directLink}
      />
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
    <div className="container mx-auto px-4 py-6 flex flex-col h-full overflow-hidden">
      <header className="flex items-center justify-between gap-4 mb-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12 flex-1 overflow-hidden">
        <div className="lg:col-span-2 flex flex-col flex-1 min-h-0 relative group">
          {isEditable && (
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
              !isEditing && "bg-background rounded-lg",
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
                <VideoPlayer
                  src={directLink}
                  title={file.name}
                  type="video"
                  poster={file.thumbnailLink}
                  mimeType={file.mimeType}
                  webViewLink={file.webViewLink}
                  subtitleTracks={subtitleTracks}
                  onEnded={() => nextFileUrl && router.push(nextFileUrl)}
                />
              </div>
            ) : fileType === "image" ? (
              <div
                className="w-full h-full rounded-xl overflow-hidden relative shadow-sm border bg-muted/5 cursor-zoom-in group/image"
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
        />
      </div>

      {internalPreviewOpen && (
        <FileDetail
          file={file}
          isModal={true}
          onCloseModal={() => setInternalPreviewOpen(false)}
          prevFileUrl={prevFileUrl}
          nextFileUrl={nextFileUrl}
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
