"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Download, Eye } from "lucide-react";
import { getIcon, getLanguageFromFilename } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { OfficeViewer } from "./OfficeViewer";
const CodeViewer = dynamic(() => import("./CodeViewer"));

const PDFViewer = dynamic(() => import("./PDFViewer"), {
  loading: () => <LoadingPreview />,
  ssr: false,
});

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

export const LoadingPreview: React.FC = () => (
  <div className="flex items-center justify-center h-full text-primary">
    <Loader2 className="animate-spin text-4xl" />
  </div>
);

export const FileIconPlaceholder: React.FC<{
  mimeType: string;
  onPreview: () => void;
  isPreviewable: boolean;
}> = ({ mimeType, onPreview, isPreviewable }) => {
  const IconComponent = getIcon(mimeType);
  const t = useTranslations("Preview");
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
          <span>{t("open")}</span>
        </button>
      ) : (
        <p className="text-muted-foreground text-sm font-medium bg-muted/30 px-4 py-2 rounded-full">
          {t("notAvailable")}
        </p>
      )}
    </div>
  );
};

export const ImagePreview: React.FC<{ src: string }> = ({ src }) => (
  <div className="relative w-full h-full">
    <Image
      src={src}
      fill
      className="object-contain select-none"
      alt="Preview"
      unoptimized
    />
  </div>
);

export const GoogleDrivePreview: React.FC<{ fileId: string }> = ({
  fileId,
}) => (
  <iframe
    src={`https://drive.google.com/file/d/${fileId}/preview`}
    className="w-full h-full border-0 bg-background"
    allow="autoplay"
    title="Preview"
  />
);

export const EbookPreview: React.FC<{ src: string }> = ({ src }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("Preview");

  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof ePub === "undefined") {
      setError(t("libraryError"));
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
    return () => book.destroy();
  }, [src, t]);

  return (
    <div className="w-full h-full bg-white text-black overflow-hidden relative">
      {isLoading && <LoadingPreview />}
      {error && (
        <div className="flex justify-center items-center h-full text-red-500">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        className={isLoading || error ? "hidden" : "w-full h-full"}
      />
    </div>
  );
};

export const CodePreview: React.FC<{ src: string; fileName: string }> = ({
  src,
  fileName,
}) => {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(src)
      .then((res) => res.text())
      .then(setContent)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [src]);

  if (isLoading) return <LoadingPreview />;
  const language = getLanguageFromFilename(fileName);
  return (
    <div className="h-full w-full overflow-hidden bg-[#1e1e1e]">
      <CodeViewer
        content={content || ""}
        language={language}
        className="h-full rounded-none border-0"
      />
    </div>
  );
};

export const DefaultPreview: React.FC<{
  mimeType: string;
  fileName: string;
  downloadUrl: string;
}> = ({ mimeType, fileName, downloadUrl }) => {
  const IconComponent = getIcon(mimeType);
  const t = useTranslations("Preview");

  if (mimeType === "application/pdf") {
    return <PDFViewer src={downloadUrl} />;
  }

  if (
    mimeType.includes("officedocument") ||
    mimeType.includes("msword") ||
    mimeType.includes("ms-excel") ||
    mimeType.includes("ms-powerpoint") ||
    fileName.match(/\.(docx|xlsx|pptx|doc|xls|ppt)$/i)
  ) {
    return <OfficeViewer fileUrl={downloadUrl} mimeType={mimeType} />;
  }

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
      <p className="text-sm text-zinc-500 mb-8">{t("notAvailable")}</p>
      <a
        href={downloadUrl}
        download
        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors shadow-lg"
      >
        <Download size={18} /> {t("download")}
      </a>
    </div>
  );
};
