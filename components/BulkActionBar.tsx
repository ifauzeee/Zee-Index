

"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Download, X, Trash2, Move, Loader2 } from 'lucide-react';
import DeleteConfirm from './DeleteConfirm';
import MoveModal from './MoveModal';

export default function BulkActionBar() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const { isBulkMode, selectedFiles, clearSelection, triggerRefresh, addToast, currentFolderId } = useAppStore();
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
        addToast({ message: 'Gagal mengunduh file ZIP.', type: 'error'});
    } finally {
        setIsDownloading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    setIsDeleting(true);
    try {
        const response = await fetch('/api/files/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileIds: selectedFiles }),
        });
        const result = await response.json();
        if (!response.ok && response.status !== 207) throw new Error(result.error || 'Gagal menghapus item.');
        
        addToast({ message: result.message, type: response.ok ? 'success' : 'info' });
        clearSelection();
        triggerRefresh();

    } catch (error: any) {
        addToast({ message: error.message, type: 'error' });
    } finally {
        setIsDeleting(false);
        setShowDeleteConfirm(false);
    }
  };
  
  const handleBulkMove = async (newParentId: string) => {
    if (selectedFiles.length === 0 || !currentFolderId) return;
    setIsMoving(true);
    try {
        const response = await fetch('/api/files/bulk-move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                fileIds: selectedFiles,
                currentParentId: currentFolderId,
                newParentId
            }),
        });
        const result = await response.json();
        if (!response.ok && response.status !== 207) throw new Error(result.error || 'Gagal memindahkan item.');

        addToast({ message: result.message, type: response.ok ? 'success' : 'info' });
        clearSelection();
        triggerRefresh();

    } catch (error: any) {
        addToast({ message: error.message, type: 'error' });
    } finally {
        setIsMoving(false);
        setShowMoveModal(false);
    }
  };


  return (
    <>
      <AnimatePresence>
        {isVisible && (
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 w-full h-20 bg-background/80 backdrop-blur-lg border-t z-50 flex justify-center items-center"
            >
                <div className="flex items-center gap-2 sm:gap-4 bg-card border shadow-lg rounded-lg p-2">
                  <span className="text-sm font-medium text-foreground px-2">{selectedFiles.length} item dipilih</span>
                  
                  <button onClick={handleBulkDownload} disabled={isDownloading} className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2 transition-colors">
                      {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                      <span className="hidden sm:inline">{isDownloading ? 'Mengunduh...' : 'Unduh'}</span>
                  </button>

                  <button onClick={() => setShowMoveModal(true)} disabled={isMoving} className="p-2 rounded-md bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-yellow-400 flex items-center gap-2 transition-colors">
                      <Move size={18} />
                      <span className="hidden sm:inline">Pindahkan</span>
                  </button>

                  <button onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting} className="p-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-destructive/50 flex items-center gap-2 transition-colors">
                      <Trash2 size={18} />
                      <span className="hidden sm:inline">Hapus</span>
                  </button>
                  
                  <button onClick={clearSelection} className="p-2 rounded-md hover:bg-muted text-muted-foreground"><X size={18} /></button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteConfirm && (
            <DeleteConfirm 
                itemName={`${selectedFiles.length} item`}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleBulkDelete}
            />
        )}
        {showMoveModal && (
            <MoveModal
                fileToMove={{ id: 'bulk', name: `${selectedFiles.length} item`, parents: [currentFolderId || ''], isFolder: false, mimeType:'', modifiedTime:'', createdTime:'', hasThumbnail: false, webViewLink: ''}}
                onClose={() => setShowMoveModal(false)}
                onConfirmMove={handleBulkMove}
            />
        )}
      </AnimatePresence>
    </>
  )
}