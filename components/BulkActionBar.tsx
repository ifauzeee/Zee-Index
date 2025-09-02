// components/BulkActionBar.tsx
"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Download, X } from 'lucide-react';

export default function BulkActionBar() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { isBulkMode, selectedFiles, clearSelection } = useAppStore();

  const isVisible = isBulkMode && selectedFiles.length > 0;

  useEffect(() => {
    if (isVisible) {
      document.body.classList.add('bulk-action-bar-visible');
    } else {
      document.body.classList.remove('bulk-action-bar-visible');
    }
    return () => {
      document.body.classList.remove('bulk-action-bar-visible');
    };
  }, [isVisible]);

  const handleBulkDownload = async () => {
    if (selectedFiles.length === 0) return;
    setIsDownloading(true);
    try {
        const response = await fetch('/api/bulk-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileIds: selectedFiles }),
        });

        if (!response.ok) throw new Error('Gagal mengunduh file');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'files.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        clearSelection();

    } catch (error) {
        console.error('Download error:', error);
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
          <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 w-full h-20 bg-background/80 backdrop-blur-lg border-t z-50 flex justify-center items-center"
          >
              <div className="flex items-center gap-4 bg-card border shadow-lg rounded-lg p-2">
                <span className="text-sm font-medium text-foreground px-2">{selectedFiles.length} file dipilih</span>
                <button 
                  onClick={handleBulkDownload}
                  disabled={isDownloading}
                  className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2 transition-colors"
                >
                    <Download size={18} />
                    {isDownloading ? 'Mengunduh...' : 'Unduh'}
                </button>
                <button onClick={clearSelection} className="p-2 rounded-md hover:bg-muted text-muted-foreground"><X size={18} /></button>
              </div>
          </motion.div>
      )}
    </AnimatePresence>
  )
}