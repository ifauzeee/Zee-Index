"use client";

import { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  Download,
  Maximize,
  Menu,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  src: string;
}

export default function PDFViewer({ src }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotate, setRotate] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { sharePolicy, user } = useAppStore();

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const changePage = (offset: number) => {
    setPageNumber((prev) =>
      Math.min(Math.max(1, prev + offset), numPages || 1),
    );
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = "document.pdf";
    link.click();
  };

  const handleRotate = () => {
    setRotate((prev) => (prev + 90) % 360);
  };

  return (
    <div className="flex flex-col w-full h-full bg-zinc-950 overflow-hidden rounded-xl border border-white/10 shadow-2xl relative">
      <div className="flex items-center justify-between w-full px-4 py-3 bg-zinc-900/90 backdrop-blur-md border-b border-white/5 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showThumbnails
                ? "bg-primary text-primary-foreground"
                : "hover:bg-white/10 text-zinc-400",
            )}
            title="Samping"
          >
            <Menu size={18} />
          </button>

          <div className="h-6 w-px bg-white/10 mx-1" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center px-2 bg-white/5 rounded-md border border-white/5 mx-1">
              <input
                type="number"
                value={pageNumber}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 1 && val <= (numPages || 1)) setPageNumber(val);
                }}
                className="w-10 bg-transparent text-center text-sm font-medium focus:outline-none text-white py-1"
              />
              <span className="text-zinc-500 text-xs font-mono ml-1">
                / {numPages || "--"}
              </span>
            </div>
            <button
              onClick={() => changePage(1)}
              disabled={pageNumber >= (numPages || 1)}
              className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/5 rounded-lg border border-white/5 p-1">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
              className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 transition-colors"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-xs font-mono text-zinc-300 w-16 text-center select-none">
              {(scale * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(3, s + 0.1))}
              className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 transition-colors"
            >
              <ZoomIn size={18} />
            </button>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <button
              onClick={handleRotate}
              className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 transition-colors"
              title="Putar"
            >
              <RotateCw size={18} />
            </button>
            {!sharePolicy?.preventDownload && (
              <button
                onClick={handleDownload}
                className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 transition-colors"
                title="Unduh"
              >
                <Download size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {showThumbnails && (
          <div className="w-64 bg-zinc-900 border-r border-white/5 overflow-y-auto p-4 space-y-4 shadow-2xl animate-in slide-in-from-left duration-300">
            <Document file={src} onLoadSuccess={onDocumentLoadSuccess}>
              {Array.from(new Array(numPages), (el, index) => (
                <div
                  key={`thumb_${index + 1}`}
                  onClick={() => setPageNumber(index + 1)}
                  className={cn(
                    "cursor-pointer rounded-lg overflow-hidden border-2 transition-all p-1 bg-zinc-800",
                    pageNumber === index + 1
                      ? "border-primary shadow-lg ring-2 ring-primary/20 scale-95"
                      : "border-transparent hover:border-white/20",
                  )}
                >
                  <Page
                    pageNumber={index + 1}
                    width={200}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                  <div className="text-[10px] text-center mt-1 text-zinc-500 font-mono">
                    {index + 1}
                  </div>
                </div>
              ))}
            </Document>
          </div>
        )}

        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-zinc-950 flex justify-center p-8 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent relative"
        >
          {sharePolicy?.hasWatermark && (
            <div className="absolute inset-0 pointer-events-none z-[90] overflow-hidden flex flex-wrap justify-around items-center opacity-[0.25] mix-blend-overlay w-full h-full select-none">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="text-zinc-400 text-xl sm:text-3xl font-black -rotate-[30deg] p-6 sm:p-10 whitespace-nowrap shadow-black drop-shadow-md mix-blend-difference"
                >
                  {user?.email || user?.name || "Confidential View"}
                  <br />
                  <span className="text-sm sm:text-lg opacity-80">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Document
            file={src}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                <Loader2 className="animate-spin h-10 w-10 text-primary" />
                <p className="text-sm font-medium animate-pulse">
                  Menyiapkan Dokumen...
                </p>
              </div>
            }
            className="shadow-2xl"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotate}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="transition-transform duration-300 ease-out"
              loading={null}
            />
          </Document>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-30">
        <button
          onClick={() => setScale(1.0)}
          className="p-3 bg-zinc-900/80 backdrop-blur-md border border-white/10 text-zinc-400 rounded-full hover:bg-primary hover:text-white transition-all shadow-xl active:scale-90"
          title="Reset Zoom"
        >
          <Maximize size={20} />
        </button>
      </div>
    </div>
  );
}
