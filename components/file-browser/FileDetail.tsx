"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Save,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ShareButton from "@/components/file-browser/ShareButton";
import InfoPanel from "../file-details/InfoPanel";
import {
  ImagePreview,
  EbookPreview,
  CodePreview,
  DefaultPreview,
  LoadingPreview,
  FileIconPlaceholder,
} from "../file-details/PreviewRenderers";
import RichMediaMetadata from "../file-details/RichMediaMetadata";
import FileDetailModalView from "./FileDetailModalView";
import {
  useFileDetailController,
  type FileDetailProps,
} from "./useFileDetailController";

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

export default function FileDetail(props: FileDetailProps) {
  const {
    file,
    isModal = false,
    prevFileUrl,
    nextFileUrl,
    currentFolderId,
    onCloseModal,
  } = props;

  const controller = useFileDetailController(props);

  const commonInfoPanelProps = {
    file,
    isAdmin: controller.isAdmin,
    canShowAuthor: controller.canShowAuthor,
    tags: controller.fileTags[file.id] || [],
    directLink: controller.directLink,
    onAddTag: (tag: string) => controller.addTag(file.id, tag),
    onRemoveTag: (tag: string) => controller.removeTag(file.id, tag),
    onCopyLink: controller.handleCopyLink,
    isImage: controller.fileType === "image",
    subtitleTracks: controller.authenticatedSubtitleTracks,
    onAddSubtitle: controller.handleAddSubtitle,
    onRemoveSubtitle: controller.handleRemoveSubtitle,
    tmdbGenres: controller.tmdbGenres,
  };

  const previewContent = (
    <div className="relative w-full h-full flex items-center justify-center">
      {(() => {
        switch (controller.fileType) {
          case "video":
            return (
              <VideoPlayer
                src={controller.directLink}
                title={file.name}
                type="video"
                poster={file.thumbnailLink}
                webViewLink={file.webViewLink}
                subtitleTracks={controller.authenticatedSubtitleTracks}
                onEnded={() =>
                  nextFileUrl && controller.router.push(nextFileUrl)
                }
              />
            );
          case "audio":
            return (
              <AudioPlayer
                src={controller.directLink}
                title={file.name}
                mimeType={file.mimeType}
                poster={file.thumbnailLink}
              />
            );
          case "image":
            return <ImagePreview src={controller.directLink} />;
          case "ebook":
            return <EbookPreview src={controller.directLink} />;
          case "markdown":
            if (controller.showTextPreview && controller.textContent) {
              return (
                <div className="w-full h-full overflow-y-auto">
                  <MarkdownViewer content={controller.textContent} />
                </div>
              );
            }
            break;
          case "text":
          case "code":
            if (controller.showTextPreview) {
              return (
                <CodePreview src={controller.directLink} fileName={file.name} />
              );
            }
            break;
        }

        return (
          <DefaultPreview
            mimeType={file.mimeType}
            fileName={file.name}
            downloadUrl={controller.directLink}
          />
        );
      })()}

      {controller.sharePolicy?.hasWatermark &&
        controller.fileType !== "video" &&
        controller.fileType !== "pdf" && (
          <div className="absolute inset-0 pointer-events-none z-[90] overflow-hidden flex flex-wrap justify-around items-center opacity-[0.25] mix-blend-difference w-full h-full select-none text-white/80">
            {Array.from({ length: 15 }).map((_, index) => (
              <div
                key={index}
                className="text-xl sm:text-3xl font-black -rotate-[30deg] p-6 sm:p-10 whitespace-nowrap drop-shadow-md"
              >
                {controller.sharePolicy?.watermarkText ||
                  controller.user?.email ||
                  controller.user?.name ||
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

  if (isModal) {
    return (
      <FileDetailModalView
        previewContent={previewContent}
        prevFileUrl={prevFileUrl}
        nextFileUrl={nextFileUrl}
        onClose={onCloseModal}
        isTextPreviewable={controller.isTextPreviewable}
        showTextPreview={controller.showTextPreview}
        onShowTextPreview={() => controller.setShowTextPreview(true)}
        isDocPreviewable={controller.isDocPreviewable}
        showDocPreview={controller.showDocPreview}
        onShowDocPreview={() => controller.setShowDocPreview(true)}
        showMobileInfo={controller.showMobileInfo}
        onShowMobileInfo={() => controller.setShowMobileInfo(true)}
        onHideMobileInfo={() => controller.setShowMobileInfo(false)}
        mobileInfoPanel={<InfoPanel {...commonInfoPanelProps} />}
      />
    );
  }

  const showShareButton = !controller.shareToken && controller.isAdmin;

  return (
    <div
      className={cn(
        "container mx-auto px-4 py-6 flex flex-col h-full",
        controller.isTheaterMode ? "max-w-none" : "overflow-hidden",
      )}
    >
      {!controller.isTheaterMode && (
        <header className="flex items-center justify-between gap-4 mb-4 animate-in fade-in slide-in-from-top-4">
          <button
            onClick={() => controller.router.back()}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={20} /> {controller.t("back")}
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
          controller.isTheaterMode
            ? "lg:grid-cols-1"
            : "lg:grid-cols-3 overflow-hidden",
        )}
      >
        <div
          className={cn(
            "flex flex-col flex-1 min-h-0 relative group transition-all duration-500",
            controller.isTheaterMode
              ? "lg:col-span-1 h-[70vh] md:h-[85vh]"
              : "lg:col-span-2",
          )}
        >
          {controller.isEditable && !controller.isTheaterMode && (
            <div className="mb-2 flex justify-end gap-2">
              {controller.isEditing && (
                <button
                  onClick={controller.handleSaveChanges}
                  disabled={controller.isSaving}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded flex items-center gap-2"
                >
                  <Save size={16} />{" "}
                  {controller.isSaving
                    ? controller.t("saving")
                    : controller.t("save")}
                </button>
              )}
              <button
                onClick={() => controller.setIsEditing(!controller.isEditing)}
                className="px-3 py-1 bg-secondary rounded"
              >
                {controller.isEditing
                  ? controller.t("cancel")
                  : controller.t("editFile")}
              </button>
            </div>
          )}

          <div
            className={cn(
              "w-full flex-1 flex items-start justify-center overflow-hidden",
              !controller.isEditing &&
                controller.fileType !== "image" &&
                "bg-background rounded-lg",
            )}
          >
            {controller.isEditing ? (
              controller.isFetchingEditableContent ? (
                <LoadingPreview />
              ) : (
                <textarea
                  value={controller.editableContent || ""}
                  onChange={(event) =>
                    controller.setEditableContent(event.target.value)
                  }
                  className="w-full h-full p-4 bg-background font-mono text-sm resize-none focus:outline-none border rounded-lg"
                  spellCheck="false"
                />
              )
            ) : controller.fileType === "video" ? (
              <div className="w-full h-full bg-black rounded-xl overflow-hidden flex items-center justify-center shadow-2xl ring-1 ring-white/10">
                {!controller.internalPreviewOpen && (
                  <VideoPlayer
                    src={controller.directLink}
                    title={file.name}
                    type="video"
                    poster={file.thumbnailLink}
                    webViewLink={file.webViewLink}
                    subtitleTracks={controller.authenticatedSubtitleTracks}
                    onEnded={() =>
                      nextFileUrl && controller.router.push(nextFileUrl)
                    }
                  />
                )}
              </div>
            ) : controller.fileType === "image" ? (
              <div
                className="w-full h-full relative cursor-zoom-in group/image flex items-center justify-center"
                onClick={() => controller.setInternalPreviewOpen(true)}
              >
                <ImagePreview src={controller.directLink} />
                <div className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity">
                  <Maximize2 size={20} />
                </div>
              </div>
            ) : (
              <FileIconPlaceholder
                mimeType={file.mimeType}
                onPreview={() => controller.setInternalPreviewOpen(true)}
                isPreviewable={controller.isPreviewable}
              />
            )}
          </div>

          {!controller.isEditing && (
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

        {!controller.isTheaterMode && (
          <InfoPanel
            {...commonInfoPanelProps}
            onEditImage={() => controller.setShowImageEditor(true)}
            onShowHistory={() => controller.setShowHistory(true)}
          />
        )}
      </div>

      {controller.fileType === "video" && !controller.isTheaterMode && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
          <RichMediaMetadata
            filename={file.name}
            onMetadataLoaded={controller.handleMetadataLoaded}
          />
        </div>
      )}

      {controller.internalPreviewOpen && (
        <FileDetail
          file={file}
          isModal={true}
          onCloseModal={() => controller.setInternalPreviewOpen(false)}
          prevFileUrl={prevFileUrl}
          nextFileUrl={nextFileUrl}
          subtitleTracks={controller.authenticatedSubtitleTracks}
          currentFolderId={currentFolderId}
        />
      )}
      {controller.showArchivePreview && controller.isArchivePreviewable && (
        <ArchivePreviewModal
          file={file}
          onClose={() => controller.setShowArchivePreview(false)}
        />
      )}
      {controller.showImageEditor && (
        <ImageEditorModal
          file={file}
          onClose={() => controller.setShowImageEditor(false)}
        />
      )}
      {controller.showHistory && (
        <FileRevisionsModal
          fileId={file.id}
          fileName={file.name}
          onClose={() => controller.setShowHistory(false)}
        />
      )}
    </div>
  );
}
