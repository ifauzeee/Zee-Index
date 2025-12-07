"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  Loader2,
  Trash2,
  ShieldPlus,
  User,
  FolderInput,
  Bell,
  Check,
  X,
  Mail,
  RefreshCw,
  SearchX
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface FolderAccess {
  folderId: string;
  email: string;
}

interface AccessRequest {
  folderId: string;
  folderName: string;
  email: string;
  name: string;
  timestamp: number;
}

export default function UserFolderAccessManager() {
  const { addToast } = useAppStore();
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAccess, setNewAccess] = useState<FolderAccess>({
    folderId: "",
    email: "",
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const permRes = await fetch("/api/admin/user-access");
      if (permRes.ok) setPermissions(await permRes.json());

      const reqRes = await fetch("/api/admin/access-requests");
      if (reqRes.ok) setRequests(await reqRes.json());
    } catch (err: any) {
      addToast({ message: "Gagal memuat data: " + err.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      fetchData();
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAccess = async (folderId: string, email: string) => {
    if (!confirm(`Hapus akses ${email} dari folder ${folderId}?`)) return;
    try {
      const response = await fetch("/api/admin/user-access", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, email }),
      });
      if (!response.ok) throw new Error("Gagal menghapus");
      addToast({ message: "Akses dicabut.", type: "success" });
      fetchData();
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    }
  };

  const handleRequestAction = async (request: AccessRequest, action: "approve" | "reject") => {
    try {
      const res = await fetch("/api/admin/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestData: request }),
      });
      if (!res.ok) throw new Error("Gagal memproses");
      addToast({ 
        message: action === "approve" ? "Permintaan disetujui & akses diberikan" : "Permintaan ditolak", 
        type: action === "approve" ? "success" : "info" 
      });
      fetchData();
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    }
  };

  const flatPermissions = Object.entries(permissions).flatMap(
    ([folderId, emails]) => emails.map((email) => ({ folderId, email })),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Manajemen Akses Folder</h2>
        <button 
          onClick={fetchData} 
          disabled={isLoading}
          className="p-2 hover:bg-accent rounded-full transition-colors"
          title="Refresh Data"
        >
          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>
      
      {requests.length > 0 && (
        <div className="mb-8 bg-card border border-blue-200 dark:border-blue-900 rounded-lg overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="bg-blue-50 dark:bg-blue-950/30 px-6 py-3 border-b border-blue-100 dark:border-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-700 dark:text-blue-300">Permintaan Akses Masuk</h3>
            </div>
            <span className="text-xs font-bold bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100 px-2 py-0.5 rounded-full">
              {requests.length}
            </span>
          </div>
          <div className="divide-y">
            {requests.map((req, idx) => (
              <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{req.name || "User"}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">{req.email}</span>
                  </div>
                  <div className="text-sm mt-1">
                    Meminta akses ke: <span className="font-mono font-semibold bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-1 rounded">{req.folderName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    ID: <span className="font-mono">{req.folderId}</span> • {format(req.timestamp, "dd MMM HH:mm", { locale: localeId })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleRequestAction(req, "approve")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95"
                  >
                    <Check size={16} /> ACC
                  </button>
                  <button 
                    onClick={() => handleRequestAction(req, "reject")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-background border hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95"
                  >
                    <X size={16} /> Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border rounded-lg p-6 space-y-6">
        <form onSubmit={handleAddAccess} className="space-y-4">
          <h4 className="text-base font-medium">Beri Akses Manual</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <FolderInput className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                name="folderId"
                value={newAccess.folderId}
                onChange={handleInputChange}
                placeholder="ID Folder Privat"
                required
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none"
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
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50 flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldPlus />}
            <span>{isSubmitting ? "Menyimpan..." : "Beri Akses"}</span>
          </button>
        </form>

        <div className="border-t pt-4 mt-4">
          <h4 className="text-base font-medium mb-3">Daftar Akses Pengguna Saat Ini</h4>
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : flatPermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic flex items-center gap-2">
              <SearchX size={16} /> Belum ada izin akses folder yang diatur.
            </p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {flatPermissions.map(({ folderId, email }) => (
                <li
                  key={`${folderId}-${email}`}
                  className="flex justify-between items-center bg-muted/30 border p-3 rounded-lg hover:border-primary/30 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-medium truncate text-primary">{folderId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail size={12} className="text-muted-foreground" />
                      <span className="text-xs text-foreground">{email}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAccess(folderId, email)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-full shrink-0 ml-2 transition-colors"
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