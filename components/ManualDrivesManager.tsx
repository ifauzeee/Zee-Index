"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { Loader2, Trash2, Plus, HardDrive, Lock, FileCog } from "lucide-react";

interface ManualDrive {
  id: string;
  name: string;
  isProtected?: boolean;
  source?: "db" | "env";
}

export default function ManualDrivesManager() {
  const { addToast } = useAppStore();
  const [dbDrives, setDbDrives] = useState<ManualDrive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (envDrives.some((d) => d.id === formData.id)) {
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
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addToast({ message: "Drive berhasil ditambahkan!", type: "success" });
      const newDbDrives = data.drives.map((d: any) => ({ ...d, source: "db" }));
      setDbDrives(newDbDrives);
      setFormData({ id: "", name: "", password: "" });
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

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Manajemen Shared Drives</h2>

      <div className="bg-card border rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium mb-4">Tambah Shortcut Baru</h3>
        <form
          onSubmit={handleSubmit}
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
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
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
  );
}
