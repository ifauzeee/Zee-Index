"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  Loader2,
  Trash2,
  ShieldPlus,
  KeyRound,
  User,
  FolderInput,
} from "lucide-react";

interface ProtectedFolder {
  id: string;
  password: string;
}

export default function ProtectedFoldersManager() {
  const { addToast } = useAppStore();
  const [folders, setFolders] = useState<Record<string, ProtectedFolder>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFolder, setNewFolder] = useState({
    folderId: "",
    id: "",
    password: "",
  });

  const fetchFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/protected-folders");
      if (!response.ok) throw new Error("Gagal mengambil data folder.");
      const data = await response.json();
      setFolders(data);
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : "Error",
        type: "error",
      });
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
        body: JSON.stringify(newFolder),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      addToast({ message: result.message, type: "success" });
      setNewFolder({ folderId: "", id: "", password: "" });
      fetchFolders();
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : "Error",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFolder = async (folderId: string) => {
    if (
      !window.confirm(
        `Anda yakin ingin menghapus perlindungan dari folder ${folderId}?`,
      )
    )
      return;
    try {
      const response = await fetch("/api/admin/protected-folders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      addToast({ message: result.message, type: "success" });
      fetchFolders();
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : "Error",
        type: "error",
      });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">
        Manajemen Folder Terproteksi
      </h2>
      <div className="bg-card border rounded-lg p-6 space-y-6">
        <form onSubmit={handleAddFolder} className="space-y-4">
          <h4 className="text-base font-medium">Tambah atau Perbarui Folder</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FolderInput className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                name="folderId"
                value={newFolder.folderId}
                onChange={handleInputChange}
                placeholder="ID Folder Google Drive"
                required
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent"
              />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                name="id"
                value={newFolder.id}
                onChange={handleInputChange}
                placeholder="ID Pengguna (e.g., user1)"
                required
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent"
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                name="password"
                value={newFolder.password}
                onChange={handleInputChange}
                placeholder="Kata Sandi"
                required
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent"
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
            <span>{isSubmitting ? "Menyimpan..." : "Simpan Perlindungan"}</span>
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
            <p className="text-sm text-muted-foreground">
              Belum ada folder yang dilindungi.
            </p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(folders).map(([folderId, config]) => (
                <li
                  key={folderId}
                  className="flex justify-between items-center bg-accent/50 p-3 rounded-md"
                >
                  <div>
                    <p className="font-mono text-sm font-medium">{folderId}</p>
                    <p className="text-xs text-muted-foreground">
                      ID Pengguna: {config.id}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveFolder(folderId)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"
                    title="Hapus Perlindungan"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
