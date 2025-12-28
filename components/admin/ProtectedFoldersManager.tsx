"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  Loader2,
  Trash2,
  ShieldPlus,
  KeyRound,
  FolderInput,
  Lock,
  FolderKey,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProtectedFolder {
  id: string;
  password: string;
}

export default function ProtectedFoldersManager() {
  const { addToast } = useAppStore();
  const [folders, setFolders] = useState<Record<string, ProtectedFolder>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState({ folderId: "", password: "" });

  const fetchFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/protected-folders");
      if (!response.ok) throw new Error("Gagal mengambil data folder.");
      setFolders(await response.json());
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewFolder((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/protected-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newFolder, id: "admin" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      addToast({ message: result.message, type: "success" });
      setNewFolder({ folderId: "", password: "" });
      fetchFolders();
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!folderToDelete) return;
    try {
      const response = await fetch("/api/admin/protected-folders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: folderToDelete }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      addToast({ message: result.message, type: "success" });
      fetchFolders();
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setFolderToDelete(null);
    }
  };

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold mb-6">
          Manajemen Folder Terproteksi
        </h2>
        <div className="bg-card border rounded-lg p-6 space-y-6">
          <form onSubmit={handleAddFolder} className="space-y-4">
            <h4 className="text-base font-medium">
              Tambah atau Perbarui Folder
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <FolderInput className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  name="folderId"
                  value={newFolder.folderId}
                  onChange={handleInputChange}
                  placeholder="ID Folder Google Drive"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  name="password"
                  value={newFolder.password}
                  onChange={handleInputChange}
                  placeholder="Kata Sandi Baru"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ShieldPlus />
              )}
              <span>
                {isSubmitting ? "Menyimpan..." : "Simpan Perlindungan"}
              </span>
            </button>
          </form>

          <div className="border-t pt-4 mt-4">
            <h4 className="text-base font-medium mb-3">
              Daftar Folder Terproteksi
            </h4>
            {isLoading ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(folders).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Belum ada folder yang dilindungi.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {Object.entries(folders).map(([folderId]) => (
                  <li
                    key={folderId}
                    className="relative group overflow-hidden bg-gradient-to-br from-card to-muted/30 border rounded-xl p-4 transition-all hover:shadow-md hover:border-primary/30"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                        <FolderKey size={20} />
                      </div>
                      <button
                        onClick={() => setFolderToDelete(folderId)}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Hapus Perlindungan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="font-mono text-xs font-semibold text-foreground break-all mb-1">
                      {folderId}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-500/10 w-fit px-2 py-0.5 rounded-full">
                      <Lock size={10} /> Terkunci Aman
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {folderToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setFolderToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card border rounded-xl shadow-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Hapus Proteksi?
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Folder{" "}
                  <span className="font-mono bg-muted px-1 rounded">
                    {folderToDelete}
                  </span>{" "}
                  akan menjadi terbuka untuk umum (kecuali jika dibatasi dari
                  Google Drive).
                </p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFolderToDelete(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border bg-background hover:bg-accent transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
