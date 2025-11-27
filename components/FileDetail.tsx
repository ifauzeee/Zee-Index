"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from "@/lib/store";
import ShareButton from "./ShareButton";
import { useSession } from "next-auth/react";
import "plyr/dist/plyr.css";
import "prismjs/themes/prism-tomorrow.min.css";
import "prismjs/plugins/line-numbers/prism-line-numbers.css";
import Prism from "prismjs";
import {
  getFileType,
  formatBytes,
  formatDuration,
  cn,
  getIcon,
  getLanguageFromFilename,
} from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
  History,
  Edit,
  FileText,
  Eye,
  Info,
  X,
  Plus,
  Download,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import ArchivePreviewModal from "./ArchivePreviewModal";
import ImageEditorModal from "./ImageEditorModal";
import FileRevisionsModal from "./FileRevisionsModal";
import { motion, AnimatePresence } from "framer-motion";

interface EPubRendition {
  display: () => Promise<void>;
}
interface EPubBook {
  renderTo: (
    element: HTMLDivElement,
    options: { width: string; height: string },
  ) => EPubRendition;
  destroy: () => void;
}
interface EPubLib {
  (src: string): EPubBook;
}
declare const ePub: EPubLib;

interface SubtitleTrack {
  kind: string;
  src: string;
  srcLang: string;
  label: string;
  default: boolean;
}

const LoadingPreview: React.FC = () => (
  <div className="flex items-center justify-center h-full text-primary">
    <Loader2 className="animate-spin text-4xl" />
  </div>
);

const FileIconPlaceholder: React.FC<{
  mimeType: string;
  onPreview: () => void;
  isPreviewable: boolean;
}> = ({ mimeType, onPreview, isPreviewable }) => {
  const IconComponent = getIcon(mimeType);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 animate-in fade-in zoom-in duration-300">
      <div className="mb-8 transform transition-transform duration-500 hover:scale-105">
        <IconComponent
          size={140}
          strokeWidth={0.8}
          className="text-muted-foreground/60"
        />
      </div>

      {isPreviewable ? (
        <button
          onClick={onPreview}
          className="group relative inline-flex items-center gap-3 px-8 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-full shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all active:scale-95"
        >
          <Eye
            size={18}
            className="transition-transform group-hover:scale-110"
          />
          <span>Buka Pratinjau</span>
        </button>
      ) : (
        <p className="text-muted-foreground text-sm font-medium bg-muted/30 px-4 py-2 rounded-full">
          Pratinjau tidak tersedia
        </p>
      )}
    </div>
  );
};

interface VideoAudioPreviewProps {
  src: string;
  type: "video" | "audio";
  poster?: string;
  mimeType: string;
  subtitleTracks?: SubtitleTrack[];
}

const VideoAudioPreview: React.FC<
  VideoAudioPreviewProps & { onEnded?: () => void }
> = ({ src, type, poster, mimeType, subtitleTracks, onEnded }) => {
  const ref = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (ref.current) {
      import("plyr").then((p) => {
        const Plyr = p.default;
        const options = {
          debug: false,
          autoplay: false,
          controls: [
            "play-large",
            "play",
            "current-time",
            "progress",
            "duration",
            "mute",
            "settings",
            "pip",
            "fullscreen",
          ],
          tooltips: { controls: true, seek: true },
          keyboard: { focused: true, global: true },
          i18n: {
            restart: "Ulang",
            rewind: "Mundur {seektime}d",
            play: "Putar",
            pause: "Jeda",
            fastForward: "Maju {seektime}d",
            seek: "Cari",
            seekLabel: "{currentTime} dari {duration}",
            played: "Diputar",
            buffered: "Buffered",
            currentTime: "Waktu Sekarang",
            duration: "Durasi",
            volume: "Volume",
            mute: "Bisukan",
            unmute: "Suarakan",
            enableCaptions: "Aktifkan Subtitle",
            disableCaptions: "Matikan Subtitle",
            download: "Unduh",
            enterFullscreen: "Layar Penuh",
            exitFullscreen: "Keluar Layar Penuh",
            frameTitle: "Pemutar {title}",
            captions: "Subtitle",
            settings: "Pengaturan",
            pip: "PiP",
            menuBack: "Kembali",
            speed: "Kecepatan",
            normal: "Normal",
            quality: "Kualitas",
            loop: "Putar Ulang",
          },
        };
        playerRef.current = new Plyr(ref.current as HTMLElement, options);
        if (onEnded) playerRef.current.on("ended", onEnded as () => void);
      });
    }
    return () => {
      if (playerRef.current) playerRef.current.destroy();
    };
  }, [onEnded]);

  const Tag = type === "video" ? "video" : "audio";
  const posterUrl = poster ? poster.replace(/=s\d+/, "=s1280") : undefined;

  return (
    <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative group">
      <style jsx global>{`
        .plyr__controls .plyr__progress__container {
          flex: 1;
          min-width: 0;
        }
        .plyr__volume input[type="range"] {
          display: none !important;
        }
        @media (max-width: 768px) {
          .plyr__controls__item.plyr__volume {
            display: flex;
          }
          .plyr__time {
            font-size: 12px;
          }
        }
        .plyr--full-ui input[type="range"] {
          color: hsl(var(--primary));
        }
        .plyr__control--overlaid {
          background: hsla(var(--primary), 0.9);
        }
        .plyr--video .plyr__control.plyr__tab-focus,
        .plyr--video .plyr__control:hover,
        .plyr--video .plyr__control[aria-expanded="true"] {
          background: hsl(var(--primary));
        }
      `}</style>

      <Tag
        ref={ref as unknown as React.RefObject<HTMLVideoElement>}
        id="player"
        playsInline
        controls
        className="w-full h-full object-contain"
        style={{ width: "100%", height: "100%", maxHeight: "100%" }}
        data-poster={posterUrl}
        crossOrigin="anonymous"
      >
        <source src={src} type={mimeType} />
        {type === "video" &&
          subtitleTracks &&
          subtitleTracks.map((track, index) => (
            <track
              key={index}
              kind={track.kind}
              src={track.src}
              srcLang={track.srcLang}
              label={track.label}
              default={track.default}
            />
          ))}
      </Tag>
    </div>
  );
};

const ImagePreview: React.FC<{ src: string }> = ({ src }) => (
  <div className="relative w-full h-full">
    <Image
      src={src}
      fill
      className="object-contain select-none"
      alt="File preview"
      unoptimized
    />
  </div>
);

const GoogleDrivePreview: React.FC<{ fileId: string }> = ({ fileId }) => (
  <iframe
    src={`https://drive.google.com/file/d/${fileId}/preview`}
    className="w-full h-full border-0 bg-background"
    allow="autoplay"
    title="Preview"
  />
);

const EbookPreview: React.FC<{ src: string }> = ({ src }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof ePub === "undefined") {
      setError("ePub.js library is not loaded.");
      setIsLoading(false);
      return;
    }
    const book = ePub(src);
    const rendition = book.renderTo(containerRef.current, {
      width: "100%",
      height: "100%",
    });
    rendition
      .display()
      .then(() => setIsLoading(false))
      .catch((err: any) => {
        setError(err.message);
        setIsLoading(false);
      });
    return () => {
      book.destroy();
    };
  }, [src]);

  return (
    <div className="w-full h-full bg-white text-black overflow-hidden relative">
      {isLoading && <LoadingPreview />}
      {error && <div className="center text-red-500">{error}</div>}
      <div
        ref={containerRef}
        className={isLoading || error ? "hidden" : "w-full h-full"}
      />
    </div>
  );
};

const CodePreview: React.FC<{ src: string; fileName: string }> = ({
  src,
  fileName,
}) => {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(src)
      .then((res) => res.text())
      .then(setContent)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [src]);

  useEffect(() => {
    if (content)
      import("prismjs/plugins/line-numbers/prism-line-numbers.min.js").then(
        () => Prism.highlightAll(),
      );
  }, [content]);

  if (isLoading) return <LoadingPreview />;
  const language = getLanguageFromFilename(fileName);
  return (
    <pre className="line-numbers h-full w-full overflow-auto text-sm !m-0 !p-4 bg-[#2d2d2d]">
      <code className={`language-${language}`}>{content}</code>
    </pre>
  );
};

const DefaultPreview: React.FC<{
  mimeType: string;
  fileName: string;
  downloadUrl: string;
}> = ({ mimeType, fileName, downloadUrl }) => {
  const IconComponent = getIcon(mimeType);
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in zoom-in duration-300">
      <div className="mb-8 transform transition-transform duration-500 hover:scale-105">
        <IconComponent
          size={140}
          strokeWidth={0.8}
          className="text-zinc-500 opacity-80"
        />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 max-w-xs">
        {fileName}
      </h3>
      <p className="text-sm text-zinc-500 mb-8">Pratinjau tidak tersedia</p>

      <a
        href={downloadUrl}
        download
        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors shadow-lg"
      >
        <Download size={18} />
        Unduh File
      </a>
    </div>
  );
};

const ARCHIVE_PREVIEW_LIMIT_BYTES = 100 * 1024 * 1024;

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
  const {
    addToast,
    user,
    triggerRefresh,
    hideAuthor,
    fileTags,
    fetchTags,
    addTag,
    removeTag,
  } = useAppStore();
  const { data: session } = useSession();

  const [internalPreviewOpen, setInternalPreviewOpen] = useState(false);

  const showBackButton = true;
  const [textContent, setTextContent] = useState<string | null>(null);
  const [editableContent, setEditableContent] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingEditableContent, setIsFetchingEditableContent] =
    useState(false);

  const [showTextPreview, setShowTextPreview] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [showArchivePreview, setShowArchivePreview] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  const handleVideoEnded = () => {
    if (nextFileUrl) router.push(nextFileUrl);
  };
  const shareToken = useMemo(
    () => searchParams.get("share_token"),
    [searchParams],
  );
  const isAdmin = user?.role === "ADMIN" || session?.user?.role === "ADMIN";
  const canShowAuthor = isAdmin || !hideAuthor;
  const fileType = getFileType(file);
  const fileSize = parseInt(file.size || "0", 10);
  const isArchive = fileType === "archive";
  const isArchivePreviewable =
    isArchive && fileSize <= ARCHIVE_PREVIEW_LIMIT_BYTES;

  const isPreviewable = useMemo(() => {
    return (
      fileType === "audio" ||
      fileType === "image" ||
      fileType === "pdf" ||
      fileType === "office" ||
      fileType === "ebook" ||
      fileType === "code" ||
      fileType === "text" ||
      fileType === "markdown"
    );
  }, [fileType]);

  useEffect(() => {
    fetchTags(file.id);
  }, [file.id, fetchTags]);

  const directLink = useMemo(() => {
    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) url += `&share_token=${shareToken}`;
    return url;
  }, [file.id, shareToken]);

  const isEditable =
    isAdmin &&
    (fileType === "code" || fileType === "markdown" || fileType === "text");
  const isTextPreviewable =
    fileType === "code" || fileType === "markdown" || fileType === "text";
  const isDocPreviewable = fileType === "office" || fileType === "pdf";

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
    if (isEditing && isEditable && editableContent === null) {
      setIsFetchingEditableContent(true);
      fetch(directLink)
        .then((res) => (res.ok ? res.text() : Promise.reject("Fail")))
        .then(setEditableContent)
        .finally(() => setIsFetchingEditableContent(false));
    }
    if (
      (fileType === "markdown" || fileType === "text") &&
      !isEditing &&
      showTextPreview
    ) {
      setIsFetchingEditableContent(true);
      fetch(directLink)
        .then((res) => (res.ok ? res.text() : Promise.reject("Fail")))
        .then(setTextContent)
        .finally(() => setIsFetchingEditableContent(false));
    }
  }, [
    isEditing,
    isEditable,
    fileType,
    directLink,
    editableContent,
    showTextPreview,
  ]);

  const handleSaveChanges = async () => {
    if (editableContent === null) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/files/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, newContent: editableContent }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan");
      addToast({ message: "Disimpan!", type: "success" });
      setIsEditing(false);
      triggerRefresh();
      if (fileType === "markdown" || fileType === "text")
        setTextContent(editableContent);
    } catch (e: any) {
      addToast({ message: e.message, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim()) {
      setIsAddingTag(true);
      await addTag(file.id, newTag.trim());
      setNewTag("");
      setIsAddingTag(false);
    }
  };

  const renderPreview = () => {
    const mimeType =
      file.mimeType === "application/octet-stream" && file.name.endsWith(".mkv")
        ? "video/x-matroska"
        : file.mimeType;
    switch (fileType) {
      case "video":
        return (
          <VideoAudioPreview
            src={directLink}
            type="video"
            poster={file.thumbnailLink}
            mimeType={mimeType}
            subtitleTracks={subtitleTracks}
            onEnded={handleVideoEnded}
          />
        );
      case "audio":
        return (
          <VideoAudioPreview
            src={directLink}
            type="audio"
            mimeType={mimeType}
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
        if (showTextPreview && textContent !== null)
          return (
            <div className="prose dark:prose-invert prose-sm w-full h-full overflow-y-auto p-4 md:p-8 bg-background">
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                {textContent}
              </ReactMarkdown>
            </div>
          );
        break;
      case "text":
        if (showTextPreview && textContent !== null)
          return (
            <div className="w-full h-full overflow-y-auto p-4 md:p-8 bg-background">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {textContent}
              </pre>
            </div>
          );
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

  const metadata = file.imageMediaMetadata || file.videoMediaMetadata;
  const durationMillis = file.videoMediaMetadata?.durationMillis
    ? parseInt(file.videoMediaMetadata.durationMillis, 10)
    : undefined;

  const ImmersivePreview = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white h-full w-full animate-in fade-in duration-200">
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <button
          onClick={onClose}
          className="pointer-events-auto p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex gap-3 pointer-events-auto">
          {isTextPreviewable && !showTextPreview && (
            <button
              onClick={() => setShowTextPreview(true)}
              className="p-2 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20"
            >
              <Eye size={20} />
            </button>
          )}
          {isDocPreviewable && !showDocPreview && (
            <button
              onClick={() => setShowDocPreview(true)}
              className="p-2 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20"
            >
              <FileText size={20} />
            </button>
          )}
          <button
            onClick={() => setShowMobileInfo(true)}
            className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <Info size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden w-full h-full">
        {prevFileUrl && (
          <Link
            href={prevFileUrl}
            className="absolute left-2 md:left-4 z-10 p-3 bg-black/30 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-all"
          >
            <ChevronLeft size={24} />
          </Link>
        )}

        <div className="w-full h-full flex items-center justify-center">
          {renderPreview()}
        </div>

        {nextFileUrl && (
          <Link
            href={nextFileUrl}
            className="absolute right-2 md:right-4 z-10 p-3 bg-black/30 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-all"
          >
            <ChevronRight size={24} />
          </Link>
        )}
      </div>

      {!isArchive &&
        fileType !== "other" &&
        !showDocPreview &&
        fileType !== "image" &&
        fileType !== "video" && (
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
            <h2
              className="text-sm font-medium text-center text-white/90 line-clamp-1 px-8 pointer-events-auto"
              title={file.name}
            >
              {file.name}
            </h2>
          </div>
        )}

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
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 rounded-t-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="p-4">
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-6" />
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold">Detail File</h3>
                  <div className="flex gap-2">
                    <a
                      href={directLink}
                      download
                      className="p-2 bg-blue-600 rounded-lg text-white"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                </div>

                <ul className="space-y-3 text-sm text-zinc-300 pb-safe">
                  <ListItem
                    label="Ukuran"
                    value={file.size ? formatBytes(Number(file.size)) : "-"}
                  />
                  <ListItem label="Tipe" value={file.mimeType} />
                  <ListItem
                    label="Diubah"
                    value={new Date(file.modifiedTime).toLocaleString("id-ID")}
                  />

                  <div className="pt-4 border-t border-zinc-800">
                    <h4 className="text-xs uppercase text-zinc-500 font-bold mb-2">
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {fileTags[file.id]?.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-zinc-800 rounded text-xs flex items-center gap-1"
                        >
                          {tag}
                          {isAdmin && (
                            <button onClick={() => removeTag(file.id, tag)}>
                              <X size={10} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {isAdmin && (
                      <form onSubmit={handleAddTag} className="flex gap-2 mt-2">
                        <input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add tag..."
                          className="flex-1 bg-zinc-800 rounded px-2 py-1 text-sm outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isAddingTag}
                          className="bg-primary px-2 rounded"
                        >
                          <Plus size={16} />
                        </button>
                      </form>
                    )}
                  </div>
                </ul>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  if (isModal) {
    return <ImmersivePreview onClose={onCloseModal || (() => {})} />;
  }

  const showShareButton = !searchParams.get("share_token") && isAdmin;

  return (
    <div className="container mx-auto px-4 py-6 flex flex-col h-full overflow-hidden">
      <header className="flex items-center justify-between gap-4 mb-4">
        {showBackButton && (
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft size={20} /> Kembali
          </button>
        )}
        {!showBackButton && <div />}
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
                  disabled={isSaving || isFetchingEditableContent}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} /> {isSaving ? "Menyimpan..." : "Simpan"}
                </button>
              )}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
              >
                {isEditing ? "Batal" : "Edit File"}
              </button>
            </div>
          )}

          <div
            className={cn(
              "w-full flex-1 flex items-start justify-center overflow-hidden",
              !isEditing && "bg-background rounded-lg",
            )}
          >
            {isEditing && isEditable ? (
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
                <VideoAudioPreview
                  src={directLink}
                  type="video"
                  poster={file.thumbnailLink?.replace("=s220", "=s1280")}
                  mimeType={file.mimeType}
                  subtitleTracks={subtitleTracks}
                  onEnded={handleVideoEnded}
                />
              </div>
            ) : (
              <FileIconPlaceholder
                mimeType={file.mimeType}
                onPreview={() => setInternalPreviewOpen(true)}
                isPreviewable={isPreviewable}
              />
            )}
          </div>

          {prevFileUrl && !isEditing && (
            <Link
              href={prevFileUrl}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 m-2 bg-background/50 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background border shadow-sm"
            >
              <ChevronLeft size={28} />
            </Link>
          )}
          {nextFileUrl && !isEditing && (
            <Link
              href={nextFileUrl}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 m-2 bg-background/50 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background border shadow-sm"
            >
              <ChevronRight size={28} />
            </Link>
          )}
        </div>

        <div className="mt-8 lg:mt-0 lg:col-span-1 lg:overflow-y-auto">
          <h1 className="text-2xl lg:text-3xl font-bold break-words mb-6">
            {file.name}
          </h1>
          {isAdmin && (
            <div className="flex gap-2 mb-6">
              {fileType === "image" && (
                <button
                  onClick={() => setShowImageEditor(true)}
                  className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Edit size={16} /> Edit Gambar
                </button>
              )}
              <button
                onClick={() => setShowHistory(true)}
                className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <History size={16} /> Riwayat
              </button>
            </div>
          )}

          <h3 className="text-lg font-semibold mb-4 border-b pb-2">
            Informasi File
          </h3>
          <ul className="space-y-3 text-sm text-foreground">
            <ListItem
              label="Ukuran"
              value={file.size ? formatBytes(Number(file.size)) : "-"}
            />
            <ListItem label="Tipe" value={file.mimeType} />
            {metadata?.width && metadata?.height && (
              <ListItem
                label="Dimensi"
                value={`${metadata.width} x ${metadata.height} px`}
              />
            )}
            {durationMillis && (
              <ListItem
                label="Durasi"
                value={formatDuration(durationMillis / 1000)}
              />
            )}
            <ListItem
              label="Diubah"
              value={new Date(file.modifiedTime).toLocaleString("id-ID")}
            />
            {canShowAuthor && file.owners && (
              <ListItem label="Pemilik" value={file.owners[0].displayName} />
            )}
          </ul>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <a
              href={directLink}
              download
              className="flex-1 flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold"
            >
              <Download size={18} className="mr-3" />
              Unduh
            </a>
          </div>
        </div>
      </div>

      {internalPreviewOpen && (
        <ImmersivePreview onClose={() => setInternalPreviewOpen(false)} />
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

const ListItem = ({ label, value }: { label: string; value: string }) => (
  <li className="flex justify-between items-start gap-4">
    <span className="font-medium text-muted-foreground">{label}</span>
    <span className="text-right break-all">{value}</span>
  </li>
);
