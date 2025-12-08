"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  Loader2,
  Trash2,
  ShieldPlus,
  User,
  FolderInput,
  Check,
  X,
  Mail,
  RefreshCw,
  SearchX,
  UserCheck,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [newAccess, setNewAccess] = useState<FolderAccess>({
    folderId: "",
    email: "",
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [permRes, reqRes] = await Promise.all([
        fetch("/api/admin/user-access"),
        fetch("/api/admin/access-requests"),
      ]);

      if (permRes.ok) setPermissions(await permRes.json());
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
    setIsProcessing("add");
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
      setIsProcessing(null);
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

  const handleRequestAction = async (
    request: AccessRequest,
    action: "approve" | "reject",
  ) => {
    const uniqueId = `${request.folderId}-${request.email}`;
    setIsProcessing(uniqueId);
    try {
      const res = await fetch("/api/admin/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestData: request }),
      });
      if (!res.ok) throw new Error("Gagal memproses");

      addToast({
        message:
          action === "approve" ? "Akses diberikan" : "Permintaan ditolak",
        type: action === "approve" ? "success" : "info",
      });

      await fetchData();
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsProcessing(null);
    }
  };

  const flatPermissions = Object.entries(permissions).flatMap(
    ([folderId, emails]) => emails.map((email) => ({ folderId, email })),
  );

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary" />
          <h2 className="text-xl font-semibold">Manajemen Akses</h2>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="p-2 hover:bg-accent rounded-full transition-colors"
        >
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <div className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="pending" className="relative">
              Permintaan Masuk
              {requests.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {requests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">Akses Aktif</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pending" className="p-0">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Check className="h-12 w-12 mb-4 text-green-500/50" />
              <p>Tidak ada permintaan akses baru.</p>
            </div>
          ) : (
            <div className="divide-y">
              {requests.map((req, idx) => {
                const uniqueId = `${req.folderId}-${req.email}`;
                const isItemProcessing = isProcessing === uniqueId;

                return (
                  <div
                    key={idx}
                    className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                          {req.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            {req.name || "User"}
                            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
                              {req.email}
                            </span>
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock size={12} />{" "}
                            {format(req.timestamp, "dd MMM yyyy, HH:mm", {
                              locale: localeId,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-sm bg-accent/50 p-3 rounded-lg border border-border/50">
                        <FolderInput
                          size={16}
                          className="text-muted-foreground"
                        />
                        <span>Meminta akses ke:</span>
                        <span className="font-mono font-bold text-primary truncate max-w-[200px]">
                          {req.folderName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          ({req.folderId})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {isItemProcessing ? (
                        <div className="flex items-center gap-2 text-muted-foreground px-4">
                          <Loader2 className="animate-spin" size={18} />{" "}
                          Memproses...
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRequestAction(req, "reject")}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-background border hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-all active:scale-95"
                          >
                            <X size={16} /> Tolak
                          </button>
                          <button
                            onClick={() => handleRequestAction(req, "approve")}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg rounded-lg text-sm font-medium transition-all active:scale-95"
                          >
                            <Check size={16} /> Setujui
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="p-6 space-y-8">
          <div className="bg-muted/30 p-5 rounded-xl border border-border/50">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <ShieldPlus size={16} /> Tambah Akses Manual
            </h4>
            <form
              onSubmit={handleAddAccess}
              className="grid grid-cols-1 md:grid-cols-12 gap-4"
            >
              <div className="md:col-span-5 relative">
                <FolderInput className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  name="folderId"
                  value={newAccess.folderId}
                  onChange={handleInputChange}
                  placeholder="Folder ID (Contoh: 1xZ...)"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-shadow"
                />
              </div>
              <div className="md:col-span-5 relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  name="email"
                  type="email"
                  value={newAccess.email}
                  onChange={handleInputChange}
                  placeholder="Email Pengguna"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-shadow"
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing === "add"}
                className="md:col-span-2 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isProcessing === "add" ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "Tambah"
                )}
              </button>
            </form>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <UserCheck size={16} /> Daftar Izin Aktif
            </h4>

            {flatPermissions.length === 0 ? (
              <div className="text-center py-10 border rounded-xl border-dashed">
                <SearchX className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">
                  Belum ada izin akses yang dikonfigurasi.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {flatPermissions.map(({ folderId, email }) => (
                  <div
                    key={`${folderId}-${email}`}
                    className="flex justify-between items-center p-3 bg-card border rounded-lg hover:shadow-sm transition-all group"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 text-primary font-mono text-sm font-medium">
                        <FolderInput size={14} />
                        <span className="truncate">{folderId}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                        <Mail size={12} />
                        <span className="truncate">{email}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAccess(folderId, email)}
                      className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Cabut Akses"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
