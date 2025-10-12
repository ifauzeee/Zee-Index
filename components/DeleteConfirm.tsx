
"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmProps {
  itemName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteConfirm({ itemName, onClose, onConfirm }: DeleteConfirmProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm();
    
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-md bg-background p-6 rounded-lg shadow-xl"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <div className="mt-0 text-left">
            <h3 className="text-lg font-semibold leading-6 text-foreground">Hapus Item</h3>
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                Apakah Anda yakin ingin menghapus <span className="font-bold">{itemName}</span>? Tindakan ini tidak dapat diurungkan.
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md hover:bg-accent">
            Batal
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:bg-destructive/50"
          >
            {isLoading ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}