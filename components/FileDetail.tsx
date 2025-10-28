"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from "@/lib/store";
import ShareButton from "./ShareButton";
import "plyr/dist/plyr.css";
import "prismjs/themes/prism-tomorrow.min.css";
import "prismjs/plugins/line-numbers/prism-line-numbers.css";
import Plyr from "plyr";
import Prism from "prismjs";
import "prismjs/plugins/line-numbers/prism-line-numbers.min.js";
import { getFileType, formatBytes, formatDuration, getIcon } from "@/lib/utils";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { renderToString } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

declare const pdfjsLib: any;
declare const ePub: any;

const LoadingPreview: React.FC = () => (
  <div className="flex items-center justify-center h-full text-primary">
    <Loader2 className="animate-spin text-4xl" />
  </div>
);

const ErrorPreview: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-full gap-4 text-red-500">
    <i className="fas fa-exclamation-triangle text-6xl"></i>
    <p>{message}</p>
  </div>
);

const VideoAudioPreview: React.FC<{
  src: string;
  type: "video" | "audio";
  poster?: string;
  mimeType: string;
}> = ({ src, type, poster, mimeType }) => {
  const ref = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (ref.current) {
      const options: Plyr.Options = {
        debug: false,
        // title: 'Preview', // <-- Hapus baris ini
      };
      playerRef.current = new Plyr(ref.current, options);
    }
    return () => {
      playerRef.current?.destroy();
    };
  }, []);

  const Tag = type === "video" ? "video" : "audio";
  const posterUrl = poster ? poster.replace(/=s\d+/, "=s1280") : undefined;

  return (
    <Tag
      // ref={ref} // <-- Ganti baris ini
      ref={ref as any} // <-- Dengan baris ini
      id="player"
      playsInline
      controls
      style={{ width: "100%", height: "100%" }}
      data-poster={posterUrl}
    >
      <source src={src} type={mimeType} />
    </Tag>
  );
};

const ImagePreview: React.FC<{ src: string }> = ({ src }) => (
  <img
    src={src}
    className="w-full h-full object-contain mx-auto"
    alt="File preview"
  />
);

const PdfPreview: React.FC<{ src: string }> = ({ src }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const loadPdf = async () => {
      if (!containerRef.current) return;
      try {
        if (typeof pdfjsLib === "undefined") {
          throw new Error("PDF.js library is not loaded.");
        }
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://mozilla.github.io/pdf.js/build/pdf.worker.mjs`;
        }

        const loadingTask = pdfjsLib.getDocument(src);
        const pdfDoc = await loadingTask.promise;
        if (isCancelled) return;

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (isCancelled) return;
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.className = "mb-4 mx-auto shadow-lg";
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (containerRef.current) {
            containerRef.current.appendChild(canvas);
          } else {
            return;
          }

          const renderContext = { canvasContext: context!, viewport: viewport };
          await page.render(renderContext).promise;
        }
        setIsLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || "Gagal memuat PDF.");
          setIsLoading(false);
        }
      }
    };
    loadPdf();
    return () => {
      isCancelled = true;
    };
  }, [src]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto p-4">
      {isLoading && <LoadingPreview />}
      {error && <ErrorPreview message={error} />}
    </div>
  );
};

const OfficePreview: React.FC<{ src: string }> = ({ src }) => (
  <iframe
    src={`https://docs.google.com/gview?url=${encodeURIComponent(src)}&embedded=true`}
    className="w-full h-full border-0"
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
      .catch((err: any) => {
        setError(err.message || "Gagal memuat e-book.");
        setIsLoading(false);
      });

    return () => {
      book.destroy();
    };
  }, [src]);

  return (
    <div className="w-full h-full">
      {isLoading && <LoadingPreview />}
      {error && <ErrorPreview message={error} />}
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
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, [src]);

  useEffect(() => {
    if (content) {
      Prism.highlightAll();
    }
  }, [content]);

  if (isLoading) return <LoadingPreview />;
  if (error) return <ErrorPreview message={error} />;

  const language = getLanguageFromFilename(fileName);
  return (
    <pre className="line-numbers h-full w-full overflow-auto text-sm !m-0 !p-4">
      <code className={`language-${language}`}>{content}</code>
    </pre>
  );
};

const DefaultPreview: React.FC<{ mimeType: string }> = ({ mimeType }) => {
  const IconComponent = getIcon(mimeType);
  const iconString = renderToString(
    <IconComponent size={256} className="text-primary/20" />,
  );
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4"
      dangerouslySetInnerHTML={{ __html: iconString }}
    />
  );
};

export default function FileDetail({ file }: { file: DriveFile }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast, user, triggerRefresh } = useAppStore();
  const [showBackButton, setShowBackButton] = useState(true);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [editableContent, setEditableContent] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingEditableContent, setIsFetchingEditableContent] =
    useState(false);

  const shareToken = useMemo(
    () => searchParams.get("share_token"),
    [searchParams],
  );

  const validateShareToken = useCallback(
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
      } catch (e) {
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

  const handleBack = () => router.back();

  const directLink = useMemo(() => {
    let url = `/api/download?fileId=${file.id}`;
    if (shareToken) {
      url += `&share_token=${shareToken}`;
    }
    return url;
  }, [file.id, shareToken]);

  const fileType = getFileType(file);
  const isEditable =
    user?.role === "ADMIN" && (fileType === "code" || fileType === "markdown");

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

    if (fileType === "markdown" && !isEditing) {
      setIsFetchingEditableContent(true);
      fetch(directLink)
        .then((res) => {
          if (!res.ok) throw new Error("Gagal mengambil konten file");
          return res.text();
        })
        .then((text) => setMarkdownContent(text))
        .catch((err) => addToast({ message: err.message, type: "error" }))
        .finally(() => setIsFetchingEditableContent(false));
    }
  }, [isEditing, isEditable, fileType, directLink, editableContent, addToast]);

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
      if (fileType === "markdown") {
        setMarkdownContent(editableContent);
      }
    } catch (error: any) {
      addToast({ message: error.message, type: "error" });
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
      case "pdf":
        return <PdfPreview src={directLink} />;
      case "office":
        return <OfficePreview src={directLink} />;
      case "ebook":
        return <EbookPreview src={directLink} />;
      case "markdown":
        if (markdownContent === null) return <LoadingPreview />;
        return (
          <div className="prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg w-full h-full overflow-y-auto p-8">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
              {markdownContent}
            </ReactMarkdown>
          </div>
        );
      case "code":
        return <CodePreview src={directLink} fileName={file.name} />;
      default:
        return <DefaultPreview mimeType={file.mimeType} />;
    }
  };

  const metadata = file.imageMediaMetadata || file.videoMediaMetadata;
  const durationMillis = file.videoMediaMetadata?.durationMillis
    ? parseInt(file.videoMediaMetadata.durationMillis, 10)
    : undefined;
  const showShareButton =
    !searchParams.get("share_token") && user?.role === "ADMIN";

  return (
    <div className="container mx-auto px-4 py-6 flex flex-col h-screen overflow-hidden">
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
            path={`/folder/${file.parents?.[0]}/file/${file.id}/${encodeURIComponent(file.name)}`}
            itemName={file.name}
          />
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12 flex-1 overflow-hidden">
        <div className="lg:col-span-2 flex flex-col flex-1 min-h-0">
          {isEditable && (
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

          <div className="w-full flex-1 flex items-start justify-center overflow-hidden bg-muted/20 rounded-lg border">
            {isEditing && isEditable ? (
              isFetchingEditableContent ? (
                <LoadingPreview />
              ) : (
                <textarea
                  value={editableContent || ""}
                  onChange={(e) => setEditableContent(e.target.value)}
                  className="w-full h-full p-4 bg-background font-mono text-sm resize-none focus:outline-none"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {renderPreview()}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 mt-8 lg:mt-0 lg:overflow-y-auto">
          <h1 className="text-2xl lg:text-3xl font-bold break-words mb-6">
            {file.name}
          </h1>
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
            {file.owners && file.owners.length > 0 && (
              <ListItem label="Pemilik" value={file.owners[0].displayName} />
            )}
            {file.lastModifyingUser && (
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
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <a
              href={directLink}
              download
              className="flex-1 flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-lg"
            >
              <i className="fas fa-download mr-3"></i>Unduh File
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const ListItem = ({ label, value }: { label: string; value: string }) => (
  <li className="flex justify-between items-start gap-4">
    <span className="font-medium text-muted-foreground">{label}</span>
    <span className="text-right break-all">{value}</span>
  </li>
);

function getLanguageFromFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "jsx",
    tsx: "tsx",
    json: "json",
    py: "python",
    css: "css",
    html: "html",
    md: "markdown",
    txt: "text",
    sh: "bash",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    go: "go",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    rs: "rust",
  };
  return langMap[ext] || "clike";
}
