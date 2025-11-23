"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Folder as FolderIcon,
  File as FileIcon,
  AlertCircle,
} from "lucide-react";
import type { DriveFile } from "@/lib/googleDrive";
import { formatBytes } from "@/lib/utils";

interface ArchivePreviewModalProps {
  file: DriveFile;
  onClose: () => void;
}

interface ArchiveEntry {
  name: string;
  size: number;
  isFolder: boolean;
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};
export default function ArchivePreviewModal({
  file,
  onClose,
}: ArchivePreviewModalProps) {
  const [content, setContent] = useState<ArchiveEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchArchiveContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/archive-preview?fileId=${file.id}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Gagal memuat isi arsip.");
        }
        const data = await response.json();
        setContent(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan tidak dikenal.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchArchiveContent();
  }, [file.id]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={overlayVariants}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-lg bg-background p-6 rounded-lg shadow-xl flex flex-col max-h-[80vh]"
          variants={modalVariants}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
          <h3 className="text-lg font-semibold mb-1">Isi Arsip</h3>
          <p
            className="text-sm text-muted-foreground mb-4 truncate"
            title={file.name}
          >
            {file.name}
          </p>

          <div className="flex-1 overflow-y-auto border rounded-md">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 p-4">
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className="bg-primary h-2.5 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "95%" }}
                    transition={{ duration: 10, ease: "linear" }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Memproses arsip, ini mungkin perlu waktu...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-48 text-red-500">
                <AlertCircle className="h-12 w-12 mb-2" />
                <p className="font-semibold">Gagal Memuat</p>
                <p className="text-sm">{error}</p>
              </div>
            ) : content.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p>Arsip ini kosong.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {content.map((entry) => (
                  <li
                    key={entry.name}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {entry.isFolder ? (
                        <FolderIcon className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm truncate" title={entry.name}>
                        {entry.name}
                      </span>
                    </div>
                    {!entry.isFolder && (
                      <span className="text-xs text-muted-foreground font-mono shrink-0 ml-2">
                        {formatBytes(entry.size)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
