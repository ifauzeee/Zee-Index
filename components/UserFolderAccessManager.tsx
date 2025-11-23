"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  Loader2,
  Trash2,
  ShieldPlus,
  UserCheck,
  User,
  FolderInput,
} from "lucide-react";

interface FolderAccess {
  folderId: string;
  email: string;
}

export default function UserFolderAccessManager() {
  const { addToast } = useAppStore();
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAccess, setNewAccess] = useState<FolderAccess>({
    folderId: "",
    email: "",
  });

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/user-access");
      if (!response.ok) throw new Error("Gagal mengambil data izin akses.");
      const data = await response.json();
      setPermissions(data);
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
    fetchPermissions();
  }, [fetchPermissions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAccess((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/user-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccess),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      addToast({ message: result.message, type: "success" });
      setNewAccess({ folderId: "", email: "" });
      fetchPermissions();
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : "Error",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAccess = async (folderId: string, email: string) => {
    if (
      !window.confirm(
        `Anda yakin ingin menghapus akses ${email} dari folder ${folderId}?`,
      )
    )
      return;
    try {
      const response = await fetch("/api/admin/user-access", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      addToast({ message: result.message, type: "success" });
      fetchPermissions();
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : "Error",
        type: "error",
      });
    }
  };

  const flatPermissions: FolderAccess[] = Object.entries(permissions).flatMap(
    ([folderId, emails]) => emails.map((email) => ({ folderId, email })),
  );

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">
        Manajemen Akses Folder Pengguna
      </h2>
      <div className="bg-card border rounded-lg p-6 space-y-6">
        <form onSubmit={handleAddAccess} className="space-y-4">
          <h4 className="text-base font-medium">
            Beri Akses Folder Privat ke Pengguna
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <FolderInput className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                name="folderId"
                value={newAccess.folderId}
                onChange={handleInputChange}
                placeholder="ID Folder Privat"
                required
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent"
              />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                name="email"
                type="email"
                value={newAccess.email}
                onChange={handleInputChange}
                placeholder="Email Pengguna"
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
            <span>{isSubmitting ? "Menyimpan..." : "Beri Akses"}</span>
          </button>
        </form>

        <div className="border-t pt-4 mt-4">
          <h4 className="text-base font-medium mb-3">
            Daftar Akses Pengguna Saat Ini
          </h4>
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : flatPermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada izin akses folder yang diatur.
            </p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {flatPermissions.map(({ folderId, email }) => (
                <li
                  key={`${folderId}-${email}`}
                  className="flex justify-between items-center bg-accent/50 p-3 rounded-md"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-medium truncate">
                      {folderId}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                      <UserCheck size={14} />
                      <span className="truncate">{email}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveAccess(folderId, email)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-full shrink-0 ml-2"
                    title="Cabut Akses"
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
