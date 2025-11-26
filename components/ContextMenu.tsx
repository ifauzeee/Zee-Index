import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Trash2,
  Share2,
  Move,
  Star,
  Copy,
  Info,
  Eye,
  Archive,
  Edit3,
  X,
} from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";
import React from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onShare: () => void;
  onMove: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  onCopy: () => void;
  onShowDetails: () => void;
  onPreview: () => void;
  isArchive: boolean;
  onArchivePreview: () => void;
  isArchivePreviewable: boolean;
  fileSize: number;
  isImage: boolean;
  onEditImage: () => void;
}

export default function ContextMenu({
  x,
  y,
  onClose,
  onRename,
  onDelete,
  onShare,
  onMove,
  onToggleFavorite,
  isFavorite,
  onCopy,
  onShowDetails,
  onPreview,
  isArchive,
  onArchivePreview,
  isArchivePreviewable,
  fileSize,
  isImage,
  onEditImage,
}: ContextMenuProps) {
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
  const desktopStyle = isDesktop ? { top: y, left: x } : undefined;

  const menuContent = (
    <ul className="py-1">
      <li>
        <button
          onClick={onPreview}
          className="w-full text-left px-4 py-3 md:py-2 text-sm text-foreground hover:bg-accent flex items-center gap-3 md:gap-2"
        >
          <Eye size={18} /> Pratinjau / Buka
        </button>
      </li>

      {isImage && (
        <li>
          <button
            onClick={onEditImage}
            className="w-full text-left px-4 py-3 md:py-2 text-sm text-foreground hover:bg-accent flex items-center gap-3 md:gap-2"
          >
            <Edit3 size={18} /> Edit Gambar
          </button>
        </li>
      )}

      <li>
        <button
          onClick={onShowDetails}
          className="w-full text-left px-4 py-3 md:py-2 text-sm text-foreground hover:bg-accent flex items-center gap-3 md:gap-2"
        >
          <Info size={18} /> Lihat Detail
        </button>
      </li>

      {isArchive && (
        <li>
          <button
            onClick={isArchivePreviewable ? onArchivePreview : undefined}
            disabled={!isArchivePreviewable}
            title={
              !isArchivePreviewable
                ? `File terlalu besar (> 100 MB). Ukuran: ${formatBytes(fileSize)}`
                : "Lihat Isi Arsip"
            }
            className="w-full text-left px-4 py-3 md:py-2 text-sm text-foreground hover:bg-accent flex items-center gap-3 md:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Archive size={18} /> Lihat Isi Arsip
          </button>
        </li>
      )}

      <li className="border-t my-1 border-border"></li>
      <li>
        <button
          onClick={onToggleFavorite}
          className="w-full text-left px-4 py-3 md:py-2 text-sm text-foreground hover:bg-accent flex items-center gap-3 md:gap-2"
        >
          <Star
            size={18}
            className={isFavorite ? "text-yellow-500 fill-yellow-500" : ""}
          />
          {isFavorite ? "Hapus dari Favorit" : "Tambah ke Favorit"}
        </button>
      </li>
      <li>
        <button
          onClick={onShare}
          className="w-full text-left px-4 py-3 md:py-2 text-sm text-foreground hover:bg-accent flex items-center gap-3 md:gap-2"
        >
          <Share2 size={18} /> Bagikan
        </button>
      </li>
      <li>
        <button
          onClick={onCopy}
          className="w-full text-left px-4 py-3 md:py-2 text-sm text-foreground hover:bg-accent flex items-center gap-3 md:gap-2"
        >
          <Copy size={18} /> Buat Salinan
        </button>
      </li>
      <li>
        <button
          onClick={onMove}
          className="w-full text-left px-4 py-3 md:py-2 text-sm text-foreground hover:bg-accent flex items-center gap-3 md:gap-2"
        >
          <Move size={18} /> Pindahkan
        </button>
      </li>
      <li>
        <button
          onClick={onRename}
          className="w-full text-left px-4 py-3 md:py-2 text-sm text-foreground hover:bg-accent flex items-center gap-3 md:gap-2"
        >
          <Pencil size={18} /> Ubah Nama
        </button>
      </li>
      <li className="border-t my-1 border-border"></li>
      <li>
        <button
          onClick={onDelete}
          className="w-full text-left px-4 py-3 md:py-2 text-sm text-red-500 hover:bg-accent flex items-center gap-3 md:gap-2 font-medium"
        >
          <Trash2 size={18} /> Hapus
        </button>
      </li>
    </ul>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          className={cn(
            "bg-background border shadow-2xl overflow-hidden z-[10000]",
            "fixed bottom-0 left-0 w-full rounded-t-2xl border-t",
            "md:fixed md:w-64 md:rounded-lg md:border md:bottom-auto md:left-auto"
          )}
          style={desktopStyle}
          initial={{ y: "100%", opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: "100%", opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex md:hidden items-center justify-center pt-3 pb-2 relative">
            <div className="w-12 h-1.5 bg-muted rounded-full" />
            <button
              onClick={onClose}
              className="absolute right-4 top-3 text-muted-foreground p-1"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[80vh] overflow-y-auto overscroll-contain">
            {menuContent}
          </div>

          <div className="p-4 pt-2 border-t mt-2 md:hidden">
            <button
              onClick={onClose}
              className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-semibold active:scale-95 transition-transform"
            >
              Batal
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}