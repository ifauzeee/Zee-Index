import { motion } from "framer-motion";
import {
  Pencil,
  Trash2,
  Share2,
  Move,
  Star,
  Copy,
  Info,
  Eye,
} from "lucide-react";
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
}: ContextMenuProps) {
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <motion.div
        className="absolute w-48 bg-background border rounded-md shadow-lg py-1"
        style={{ top: y, left: x }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.1 }}
      >
        <ul>
          <li>
            <button
              onClick={onPreview}
              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              <Eye size={16} /> Pratinjau Cepat
            </button>
          </li>
          <li>
            <button
              onClick={onShowDetails}
              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              <Info size={16} /> Lihat Detail
            </button>
          </li>
          <li className="border-t my-1"></li>
          <li>
            <button
              onClick={onToggleFavorite}
              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              <Star
                size={16}
                className={isFavorite ? "text-yellow-500 fill-yellow-500" : ""}
              />
              {isFavorite ? "Hapus dari Favorit" : "Tambah ke Favorit"}
            </button>
          </li>
          <li>
            <button
              onClick={onShare}
              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              <Share2 size={16} /> Bagikan
            </button>
          </li>
          <li>
            <button
              onClick={onCopy}
              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              <Copy size={16} /> Buat Salinan
            </button>
          </li>
          <li>
            <button
              onClick={onMove}
              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              <Move size={16} /> Pindahkan
            </button>
          </li>
          <li>
            <button
              onClick={onRename}
              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              <Pencil size={16} /> Ubah Nama
            </button>
          </li>
          <li>
            <button
              onClick={onDelete}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-accent flex items-center gap-2"
            >
              <Trash2 size={16} /> Hapus
            </button>
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
