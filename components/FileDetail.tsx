"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
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
  Archive,
  History,
  Edit,
  FileText,
  Eye,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import ArchivePreviewModal from "./ArchivePreviewModal";
import ImageEditorModal from "./ImageEditorModal";
import FileRevisionsModal from "./FileRevisionsModal";

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
        };
        playerRef.current = new Plyr(ref.current as HTMLElement, options);

        if (onEnded) {
          playerRef.current.on("ended", onEnded as () => void);
        }
      });
    }
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [onEnded]);

  const Tag = type === "video" ? "video" : "audio";
  const posterUrl = poster ? poster.replace(/=s\d+/, "=s1280") : undefined;

  return (
    <Tag
      ref={ref as unknown as React.RefObject<HTMLVideoElement>}
      id="player"
      playsInline
      controls
      style={{ width: "100%", height: "100%" }}
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
  );
};

const ImagePreview: React.FC<{ src: string }> = ({ src }) => (
  <Image src={src} layout="fill" objectFit="contain" alt="File preview" />
);

const GoogleDrivePreview: React.FC<{ fileId: string }> = ({ fileId }) => (
  <iframe
    src={`https://drive.google.com/file/d/${fileId}/preview`}
    className="w-full h-full border-0 rounded-lg bg-muted/20"
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
      .then(() => {
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Gagal memuat e-book.");
        setIsLoading(false);
      });

    return () => {
      book.destroy();
    };
  }, [src]);

  return (
    <div className="w-full h-full">
      {isLoading && <LoadingPreview />}
      {error && (
        <div className="flex flex-col items-center justify-center h-full text-red-500">
          <p>{error}</p>
        </div>
      )}
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error("Gagal mengambil konten file");
        const textContent = await response.text();
        setContent(textContent);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Gagal memuat kode.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, [src]);

  useEffect(() => {
    if (content) {
      import("prismjs/plugins/line-numbers/prism-line-numbers.min.js")
        .then(() => {
          Prism.highlightAll();
        })
        .catch((e) => console.error("Failed to load Prism plugin:", e));
    }
  }, [content]);

  if (isLoading) return <LoadingPreview />;
  if (error)
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <p>{error}</p>
      </div>
    );

  const language = getLanguageFromFilename(fileName);

  return (
    <pre className="line-numbers h-full w-full overflow-auto text-sm !m-0 !p-4">
      <code className={`language-${language}`}>{content}</code>
    </pre>
  );
};

const DefaultPreview: React.FC<{ mimeType: string }> = ({ mimeType }) => {
  const IconComponent = getIcon(mimeType);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <IconComponent size={256} className="text-primary/20" />
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
}: {
  file: DriveFile;
  isModal?: boolean;
  prevFileUrl?: string;
  nextFileUrl?: string;
  subtitleTracks?: SubtitleTrack[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast, user, triggerRefresh, hideAuthor } = useAppStore();
  const { data: session } = useSession();
  const [showBackButton, setShowBackButton] = useState(true);

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

  const handleVideoEnded = () => {
    if (nextFileUrl) {
      router.push(nextFileUrl);
    }
  };

  const shareToken = useMemo(
    () => searchParams.get("share_token"),
    [searchParams],
  );

  const isAdmin = user?.role === "ADMIN" || session?.user?.role === "ADMIN";
  const canShowAuthor = isAdmin || !hideAuthor;

  const fileType = getFileType(file);
  const fileSize = parseInt(file.size || "0", 10);

  const isDefaultPreview =
    (fileType === "markdown" && !showTextPreview) ||
    (fileType === "text" && !showTextPreview) ||
    (fileType === "code" && !showTextPreview) ||
    ((fileType === "office" || fileType === "pdf") && !showDocPreview) ||
    fileType === "archive" ||
    fileType === "other";

  const isArchive = fileType === "archive";
  const isArchivePreviewable =
    isArchive && fileSize <= ARCHIVE_PREVIEW_LIMIT_BYTES;

  const validateShareToken = React.useCallback(
    async (token: string) => {
      try {
        const res = await fetch("/api/share/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shareToken: token }),
        });
        const data = await res.json();

        if (!data.valid) {
          addToast({
            message: "Tautan berbagi ini tidak valid atau telah dicabut.",
            type: "error",
          });
          router.push("/login?error=ShareLinkRevoked");
        }
      } catch {
        addToast({
          message: "Gagal memvalidasi tautan berbagi.",
          type: "error",
        });
        router.push("/login?error=InvalidOrExpiredShareLink");
      }
    },
    [addToast, router],
  );

  useEffect(() => {
    if (shareToken) {
      validateShareToken(shareToken);
      try {
        const decodedToken: { path: string; exp: number } =
          jwtDecode(shareToken);
        const currentPath = window.location.pathname;

        if (decodedToken.path === currentPath) {
          setShowBackButton(false);
        }

        const expirationTime = decodedToken.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiration = expirationTime - currentTime;

        if (timeUntilExpiration > 0) {
          const timer = setTimeout(() => {
            addToast({
              message: "Sesi berbagi Anda telah berakhir.",
              type: "info",
            });
            router.push("/login?error=InvalidOrExpiredShareLink");
          }, timeUntilExpiration);

          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error("Token tidak valid:", error);
      }
    }
  }, [shareToken, router, addToast, validateShareToken]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;

      if (e.key === "ArrowLeft") {
        if (prevFileUrl) router.push(prevFileUrl);
      } else if (e.key === "ArrowRight") {
        if (nextFileUrl) router.push(nextFileUrl);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [prevFileUrl, nextFileUrl, router, isEditing]);

  const handleBack = () => router.back();

  const directLink = useMemo(() => {
    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) {
      url += `&share_token=${shareToken}`;
    }
    return url;
  }, [file.id, shareToken]);

  const isEditable =
    isAdmin &&
    (fileType === "code" || fileType === "markdown" || fileType === "text");

  const isTextPreviewable =
    fileType === "code" || fileType === "markdown" || fileType === "text";

  const isDocPreviewable = fileType === "office" || fileType === "pdf";

  useEffect(() => {
    if (isEditing && isEditable && editableContent === null) {
      setIsFetchingEditableContent(true);
      fetch(directLink)
        .then((res) => {
          if (!res.ok) throw new Error("Gagal mengambil konten file");
          return res.text();
        })
        .then((text) => setEditableContent(text))
        .catch((err) => addToast({ message: err.message, type: "error" }))
        .finally(() => setIsFetchingEditableContent(false));
    }

    if (
      (fileType === "markdown" || fileType === "text") &&
      !isEditing &&
      showTextPreview
    ) {
      setIsFetchingEditableContent(true);
      fetch(directLink)
        .then((res) => {
          if (!res.ok) throw new Error("Gagal mengambil konten file");
          return res.text();
        })
        .then((text) => setTextContent(text))
        .catch((err) => addToast({ message: err.message, type: "error" }))
        .finally(() => setIsFetchingEditableContent(false));
    }
  }, [
    isEditing,
    isEditable,
    fileType,
    directLink,
    editableContent,
    addToast,
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
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal menyimpan file.");
      addToast({ message: "Perubahan berhasil disimpan!", type: "success" });
      setIsEditing(false);
      triggerRefresh();
      if (fileType === "markdown" || fileType === "text") {
        setTextContent(editableContent);
      }
    } catch (error: unknown) {
      addToast({
        message: error instanceof Error ? error.message : "Gagal menyimpan",
        type: "error",
      });
    } finally {
      setIsSaving(false);
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
        if (showDocPreview) {
          return <GoogleDrivePreview fileId={file.id} />;
        }
        break;
      case "ebook":
        return <EbookPreview src={directLink} />;
      case "markdown":
        if (showTextPreview) {
          if (textContent === null) return <LoadingPreview />;
          return (
            <div className="prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg w-full h-full overflow-y-auto p-8">
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                {textContent}
              </ReactMarkdown>
            </div>
          );
        }
        break;
      case "text":
        if (showTextPreview) {
          if (textContent === null) return <LoadingPreview />;
          return (
            <div className="w-full h-full overflow-y-auto p-8 bg-background">
              <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
                {textContent}
              </pre>
            </div>
          );
        }
        break;
      case "code":
        if (showTextPreview) {
          return <CodePreview src={directLink} fileName={file.name} />;
        }
        break;

      default:
        return <DefaultPreview mimeType={file.mimeType} />;
    }
    return <DefaultPreview mimeType={file.mimeType} />;
  };

  const metadata = file.imageMediaMetadata || file.videoMediaMetadata;
  const durationMillis = file.videoMediaMetadata?.durationMillis
    ? parseInt(file.videoMediaMetadata.durationMillis, 10)
    : undefined;

  const showShareButton = !searchParams.get("share_token") && isAdmin;

  return (
    <div className="container mx-auto px-4 py-6 flex flex-col h-full overflow-hidden">
      {!isModal && (
        <header className="flex items-center justify-between gap-4 mb-4">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft size={20} /> Kembali
            </button>
          )}

          {!showBackButton && <div />}

          {showShareButton && (
            <ShareButton
              path={`/folder/${file.parents?.[0]}/file/${
                file.id
              }/${encodeURIComponent(file.name)}`}
              itemName={file.name}
            />
          )}
        </header>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12 flex-1 overflow-hidden">
        <div className="lg:col-span-2 flex flex-col flex-1 min-h-0 relative group">
          {isEditable && !isModal && (
            <div className="mb-2 flex justify-end gap-2">
              {isEditing && (
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving || isFetchingEditableContent}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} />

                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
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
              !isEditing &&
                !isDefaultPreview &&
                "bg-muted/20 rounded-lg border",
              isEditing && "rounded-lg border",
            )}
          >
            {isEditing && isEditable && !isModal ? (
              isFetchingEditableContent ? (
                <LoadingPreview />
              ) : fileType === "markdown" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px h-full w-full bg-border">
                  <textarea
                    value={editableContent || ""}
                    onChange={(e) => setEditableContent(e.target.value)}
                    className="w-full h-full p-4 bg-background font-mono text-sm resize-none focus:outline-none"
                    spellCheck="false"
                  />
                  <div className="prose dark:prose-invert prose-sm w-full h-full overflow-y-auto p-4 bg-background">
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                      {editableContent || ""}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <textarea
                  value={editableContent || ""}
                  onChange={(e) => setEditableContent(e.target.value)}
                  className="w-full h-full p-4 bg-background font-mono text-sm resize-none focus:outline-none"
                  spellCheck="false"
                />
              )
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                {renderPreview()}
              </div>
            )}
          </div>

          {!isModal && prevFileUrl && (
            <Link
              href={prevFileUrl}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 m-2 bg-background/50 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
              title="File Sebelumnya (Panah Kiri)"
            >
              <ChevronLeft size={28} />
            </Link>
          )}

          {!isModal && nextFileUrl && (
            <Link
              href={nextFileUrl}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 m-2 bg-background/50 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
              title="File Berikutnya (Panah Kanan)"
            >
              <ChevronRight size={28} />
            </Link>
          )}
        </div>

        <div
          className={`lg:col-span-1 lg:overflow-y-auto ${
            isModal ? "mt-4 lg:mt-0" : "mt-8 lg:mt-0"
          }`}
        >
          <h1 className="text-2xl lg:text-3xl font-bold break-words mb-6">
            {file.name}
          </h1>

          {isAdmin && !isModal && (
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
              value={new Date(file.modifiedTime).toLocaleString("id-ID", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            />

            <ListItem
              label="Dibuat"
              value={new Date(file.createdTime).toLocaleString("id-ID", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            />
            {canShowAuthor && file.owners && file.owners.length > 0 && (
              <ListItem label="Pemilik" value={file.owners[0].displayName} />
            )}
            {canShowAuthor && file.lastModifyingUser && (
              <ListItem
                label="Diubah oleh"
                value={file.lastModifyingUser.displayName}
              />
            )}
            {file.md5Checksum && (
              <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-border">
                <span className="font-medium text-muted-foreground shrink-0">
                  MD5
                </span>
                <span className="font-mono text-xs break-all text-left sm:text-right">
                  {file.md5Checksum}
                </span>
              </li>
            )}
          </ul>
          {!isModal && (
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              {isTextPreviewable && !showTextPreview && (
                <button
                  onClick={() => setShowTextPreview(true)}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-semibold text-lg"
                >
                  <Eye className="mr-3" size={20} /> Lihat Teks
                </button>
              )}

              {isDocPreviewable && !showDocPreview && (
                <button
                  onClick={() => setShowDocPreview(true)}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-semibold text-lg"
                >
                  <FileText className="mr-3" size={20} /> Lihat Dokumen
                </button>
              )}

              {isArchive && (
                <button
                  onClick={() => setShowArchivePreview(true)}
                  disabled={!isArchivePreviewable}
                  title={
                    !isArchivePreviewable
                      ? `File terlalu besar (> 100 MB) untuk pratinjau. Ukuran: ${formatBytes(
                          fileSize,
                        )}`
                      : "Lihat Isi Arsip"
                  }
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Archive className="mr-3" size={20} />
                  Lihat Arsip
                </button>
              )}

              <a
                href={directLink}
                download
                className="flex-1 flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-lg"
              >
                <i className="fas fa-download mr-3"></i>Unduh File
              </a>
            </div>
          )}
        </div>
      </div>
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