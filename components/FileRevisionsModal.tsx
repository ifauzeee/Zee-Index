"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, History, Download, Clock, User, Loader2 } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useScrollLock } from "@/hooks/useScrollLock";

interface DriveRevision {
  id: string;
  modifiedTime: string;
  size: string;
  originalFilename: string;
  lastModifyingUser?: { displayName: string };
}

interface FileRevisionsModalProps {
  fileId: string;
  fileName: string;
  onClose: () => void;
}

export default function FileRevisionsModal({
  fileId,
  fileName,
  onClose,
}: FileRevisionsModalProps) {
  const [revisions, setRevisions] = useState<DriveRevision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useAppStore();

  useScrollLock(true);

  useEffect(() => {
    const fetchRevisions = async () => {
      try {
        const res = await fetch(`/api/files/${fileId}/revisions`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setRevisions(data.reverse());
      } catch {
        addToast({ message: "Gagal memuat riwayat", type: "error" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchRevisions();
  }, [fileId, addToast]);

  const handleDownload = (revId: string) => {
    window.open(
      `https://www.googleapis.com/drive/v3/files/${fileId}/revisions/${revId}?alt=media`,
      "_blank",
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-background w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-border max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <History className="text-primary" size={20} />
            Riwayat Versi: {fileName}
          </h3>
          <button onClick={onClose} className="hover:bg-muted p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin" />
            </div>
          ) : revisions.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              Tidak ada revisi lain.
            </div>
          ) : (
            <div className="space-y-3">
              {revisions.map((rev) => (
                <div
                  key={rev.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border hover:bg-muted/60 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock size={14} className="text-muted-foreground" />
                      {new Date(rev.modifiedTime).toLocaleString("id-ID")}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User size={12} />{" "}
                        {rev.lastModifyingUser?.displayName || "Unknown"}
                      </span>
                      <span>{formatBytes(parseInt(rev.size || "0"))}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(rev.id)}
                    className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-full"
                    title="Download Versi Ini"
                  >
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
