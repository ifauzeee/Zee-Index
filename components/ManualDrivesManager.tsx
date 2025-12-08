"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  Loader2,
  Trash2,
  Plus,
  HardDrive,
  Lock,
  FileCog,
  Search,
  FolderSymlink,
  User,
  X,
  KeyRound,
  FolderInput,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ManualDrive {
  id: string;
  name: string;
  isProtected?: boolean;
  source?: "db" | "env";
}

interface ScannedDrive {
  id: string;
  name: string;
  kind: "teamDrive" | "sharedFolder";
  owner?: string;
}

export default function ManualDrivesManager() {
  const { addToast } = useAppStore();
  const [dbDrives, setDbDrives] = useState<ManualDrive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDrives, setScannedDrives] = useState<ScannedDrive[]>([]);

  const [driveToConfigure, setDriveToConfigure] = useState<ScannedDrive | null>(
    null,
  );
  const [configName, setConfigName] = useState("");
  const [configPassword, setConfigPassword] = useState("");

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    password: "",
  });

  const envDrives = useMemo<ManualDrive[]>(() => {
    const envString = process.env.NEXT_PUBLIC_MANUAL_DRIVES || "";
    return envString.split(",").reduce<ManualDrive[]>((acc, entry) => {
      const [id, name] = entry.split(":");
      if (id && id.trim()) {
        acc.push({
          id: id.trim(),
          name: name?.trim() || id.trim(),
          isProtected: false,
          source: "env",
        });
      }
      return acc;
    }, []);
  }, []);

  const fetchDrives = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/manual-drives");
      if (res.ok) {
        const data = await res.json();
        const taggedData = data.map((d: any) => ({ ...d, source: "db" }));
        setDbDrives(taggedData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrives();
  }, [fetchDrives]);

  const allDrives = useMemo(() => {
    const dbIds = new Set(dbDrives.map((d) => d.id));
    const filteredEnv = envDrives.filter((d) => !dbIds.has(d.id));
    return [...dbDrives, ...filteredEnv];
  }, [dbDrives, envDrives]);

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDrive(formData.id, formData.name, formData.password);
    setFormData({ id: "", name: "", password: "" });
  };

  const handleConfigureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveToConfigure) return;
    await addDrive(driveToConfigure.id, configName, configPassword);
    setDriveToConfigure(null);
    setConfigName("");
    setConfigPassword("");
  };

  const addDrive = async (id: string, name: string, password?: string) => {
    if (envDrives.some((d) => d.id === id)) {
      if (
        !confirm(
          "ID ini sudah ada di file .env. Apakah Anda ingin menimpanya dengan konfigurasi Database?",
        )
      ) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/manual-drives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addToast({ message: "Drive berhasil ditambahkan!", type: "success" });
      const newDbDrives = data.drives.map((d: any) => ({ ...d, source: "db" }));
      setDbDrives(newDbDrives);
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus shortcut drive ini dari Database?")) return;
    try {
      const res = await fetch("/api/admin/manual-drives", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        const newDbDrives = data.drives.map((d: any) => ({
          ...d,
          source: "db",
        }));
        setDbDrives(newDbDrives);
        addToast({ message: "Dihapus.", type: "success" });
      }
    } catch (e) {
      console.error("Delete error:", e);
      addToast({ message: "Gagal menghapus.", type: "error" });
    }
  };

  const handleScanDrives = async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/admin/drives/scan");
      if (res.ok) {
        const data = await res.json();
        setScannedDrives(data);
        if (data.length === 0) {
          addToast({
            message:
              "Tidak ada Shared Drive atau Folder yang dibagikan ditemukan.",
            type: "info",
          });
        }
      } else {
        throw new Error("Gagal scanning drives");
      }
    } catch (e: any) {
      addToast({ message: e.message, type: "error" });
    } finally {
      setIsScanning(false);
    }
  };

  const openConfigureModal = (drive: ScannedDrive) => {
    setDriveToConfigure(drive);
    setConfigName(drive.name);
    setConfigPassword("");
  };

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold mb-6">Manajemen Shared Drives</h2>

        <div className="bg-card border rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium mb-4">Tambah Shortcut Manual</h3>
          <form
            onSubmit={handleSubmitManual}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end"
          >
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Folder ID
              </label>
              <input
                required
                placeholder="Contoh: 1AbCdEfG..."
                value={formData.id}
                onChange={(e) =>
                  setFormData({ ...formData, id: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Nama Tampilan
              </label>
              <input
                required
                placeholder="Contoh: Project X"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Password (Opsional)
              </label>
              <input
                type="password"
                placeholder="Biarkan kosong jika publik"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Plus size={18} />
              )}
              Tambah
            </button>
          </form>
        </div>

        <div className="bg-card border rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">
              Auto-Discovery (Shared Drives & Folders)
            </h3>
            <button
              onClick={handleScanDrives}
              disabled={isScanning}
              className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isScanning ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Search size={16} />
              )}
              Scan Drive
            </button>
          </div>

          {scannedDrives.length > 0 && (
            <div className="grid gap-2 max-h-80 overflow-y-auto border rounded-md p-2">
              {scannedDrives.map((drive) => {
                const isAdded = allDrives.some((d) => d.id === drive.id);
                return (
                  <div
                    key={drive.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md border border-transparent hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`p-2 rounded-lg ${drive.kind === "teamDrive" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30" : "bg-purple-100 text-purple-600 dark:bg-purple-900/30"}`}
                      >
                        {drive.kind === "teamDrive" ? (
                          <HardDrive size={18} />
                        ) : (
                          <FolderSymlink size={18} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {drive.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate font-mono bg-muted px-1.5 py-0.5 rounded">
                            {drive.id}
                          </span>
                          {drive.owner && (
                            <span className="flex items-center gap-1">
                              <User size={10} /> {drive.owner}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isAdded ? (
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
                        Sudah Ditambah
                      </span>
                    ) : (
                      <button
                        onClick={() => openConfigureModal(drive)}
                        className="text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors"
                      >
                        Konfigurasi & Tambah
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium mb-4">Daftar Drive Aktif</h3>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin" />
            </div>
          ) : allDrives.length === 0 ? (
            <p className="text-muted-foreground italic">
              Belum ada drive manual ditambahkan.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {allDrives.map((drive) => (
                <div
                  key={drive.id}
                  className="flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm relative overflow-hidden"
                >
                  {drive.source === "env" && (
                    <div className="absolute top-0 right-0 bg-muted px-2 py-0.5 text-[10px] text-muted-foreground rounded-bl-md border-l border-b border-border">
                      Config .env
                    </div>
                  )}
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`p-2 rounded-full ${drive.source === "env" ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" : drive.isProtected ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}
                    >
                      {drive.source === "env" ? (
                        <FileCog size={20} />
                      ) : (
                        <HardDrive size={20} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{drive.name}</p>
                      <p className="text-xs text-muted-foreground truncate font-mono">
                        {drive.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {drive.isProtected && (
                      <div title="Terproteksi Password">
                        <Lock size={14} className="text-amber-500" />
                      </div>
                    )}
                    {drive.source === "db" ? (
                      <button
                        onClick={() => handleDelete(drive.id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="Hapus dari Database"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : (
                      <div title="Dikunci oleh .env (Hapus dari file .env untuk menghilangkan)">
                        <Lock
                          size={18}
                          className="text-muted-foreground/30 p-2 box-content"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {driveToConfigure && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDriveToConfigure(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card border rounded-xl shadow-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">Tambahkan Drive</h3>
                  <p className="text-sm text-muted-foreground">
                    Konfigurasi shortcut untuk item ini
                  </p>
                </div>
                <button
                  onClick={() => setDriveToConfigure(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg mb-4 text-sm border border-border/50">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <HardDrive size={14} /> {driveToConfigure.name}
                </p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  {driveToConfigure.id}
                </p>
              </div>

              <form onSubmit={handleConfigureSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                    Nama Tampilan
                  </label>
                  <div className="relative">
                    <FolderInput className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      required
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-background border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Nama folder..."
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                    Password (Opsional)
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={configPassword}
                      onChange={(e) => setConfigPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-background border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Biarkan kosong untuk akses publik"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Jika diisi, folder ini akan dikunci dan memerlukan password
                    untuk dibuka.
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setDriveToConfigure(null)}
                    className="flex-1 py-2.5 border rounded-lg hover:bg-accent font-medium text-sm transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      "Simpan & Tambah"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}