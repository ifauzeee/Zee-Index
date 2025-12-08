"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
} from "lucide-react";
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

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) =>
      Math.min(Math.max(1, prevPageNumber + offset), numPages || 1),
    );
  };

  return (
    <div className="flex flex-col items-center w-full h-full bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between w-full px-4 py-2 bg-zinc-800 border-b border-zinc-700 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="p-1 rounded hover:bg-zinc-700 disabled:opacity-50 text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm text-white">
            {pageNumber} / {numPages || "--"}
          </span>
          <button
            onClick={() => changePage(1)}
            disabled={pageNumber >= (numPages || 1)}
            className="p-1 rounded hover:bg-zinc-700 disabled:opacity-50 text-white"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            className="p-1 rounded hover:bg-zinc-700 text-white"
          >
            <ZoomOut size={20} />
          </button>
          <span className="text-sm text-white w-12 text-center">
            {(scale * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.1))}
            className="p-1 rounded hover:bg-zinc-700 text-white"
          >
            <ZoomIn size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto w-full flex justify-center p-4">
        <Document
          file={src}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-full text-white">
              <Loader2 className="animate-spin mr-2" /> Memuat PDF...
            </div>
          }
          className="max-w-full"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  );
}
