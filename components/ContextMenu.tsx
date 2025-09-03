// components/ContextMenu.tsx
import { motion } from 'framer-motion';
import { Pencil, Trash2, Share2 } from 'lucide-react'; // BARU: Impor ikon Share2

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onShare: () => void; // BARU: Tambahkan handler untuk Share
}

export default function ContextMenu({ x, y, onClose, onRename, onDelete, onShare }: ContextMenuProps) {
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
          {/* BARU: Item menu untuk Bagikan */}
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