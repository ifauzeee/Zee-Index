"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

interface FileRequestModalProps {
  folderId: string;
  folderName: string;
  onClose: () => void;
}

export default function FileRequestModal({
  folderId,
  folderName,
  onClose,
}: FileRequestModalProps) {
  const { addToast } = useAppStore();
  const [title, setTitle] = useState(`Upload ke ${folderName}`);
  const [expiresIn, setExpiresIn] = useState(24);
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/file-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, folderName, title, expiresIn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResultUrl(data.publicUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addToast({ message: message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (resultUrl) {
      navigator.clipboard.writeText(resultUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({ message: "Link disalin!", type: "success" });
    }
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
        className="bg-background w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <UploadCloud size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Terima File</h3>
                <p className="text-xs text-muted-foreground">
                  Buat link upload publik untuk folder ini
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          {!resultUrl ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Judul Permintaan
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border bg-transparent focus:ring-2 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Kadaluarsa Dalam (Jam)
                </label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-md border bg-transparent focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value={1}>1 Jam</option>
                  <option value={24}>24 Jam (1 Hari)</option>
                  <option value={72}>3 Hari</option>
                  <option value={168}>1 Minggu</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "Buat Link Upload"
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm text-center">
                Link berhasil dibuat! Orang lain dapat mengupload file ke folder
                ini tanpa login.
              </div>
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <LinkIcon
                  size={16}
                  className="text-muted-foreground shrink-0"
                />
                <input
                  readOnly
                  value={resultUrl}
                  className="flex-1 bg-transparent text-sm outline-none text-muted-foreground"
                />
                <button
                  onClick={handleCopy}
                  className="p-2 bg-background border rounded-md hover:bg-accent transition-colors"
                >
                  {copied ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 bg-secondary text-secondary-foreground rounded-md font-medium hover:bg-secondary/80"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
