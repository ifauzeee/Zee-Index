"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Link2,
  Search,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Trash2,
  Ban,
  ExternalLink,
  Share2,
} from "lucide-react";
import { motion } from "framer-motion";
import { TableSkeleton } from "@/components/admin/skeletons";
import { useConfirm } from "@/components/providers/ModalProvider";
import PageTransition from "@/components/ui/PageTransition";

interface ShareLinkItem {
  id: string;
  path: string;
  token: string;
  jti: string;
  expiresAt: string;
  loginRequired: boolean;
  itemName: string;
  isCollection: boolean;
  maxUses: number | null;
  preventDownload: boolean;
  hasWatermark: boolean;
  watermarkText: string | null;
  viewCount: number;
  createdAt: string;
  createdBy: string | null;
}

type StatusFilter = "all" | "active" | "expired";

export default function ShareLinkManager() {
  const [links, setLinks] = useState<ShareLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  const { addToast } = useAppStore();
  const { confirm } = useConfirm();

  const fetchLinks = useCallback(async (isBackground = false) => {
    if (isBackground) setIsRefetching(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/share/list");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLinks(Array.isArray(data) ? data : []);
    } catch {
      setError("Gagal memuat daftar tautan berbagi");
    } finally {
      if (isBackground) setIsRefetching(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const filteredLinks = useMemo(() => {
    const now = new Date();
    return links.filter((link) => {
      const matchesSearch =
        !search ||
        link.itemName.toLowerCase().includes(search.toLowerCase()) ||
        link.path.toLowerCase().includes(search.toLowerCase()) ||
        (link.createdBy || "").toLowerCase().includes(search.toLowerCase());

      const isExpired = new Date(link.expiresAt) < now;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !isExpired) ||
        (statusFilter === "expired" && isExpired);

      return matchesSearch && matchesStatus;
    });
  }, [links, search, statusFilter]);

  const handleCopyUrl = async (link: ShareLinkItem) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}${link.path}?share_token=${link.token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (link: ShareLinkItem) => {
    const confirmed = await confirm(
      `Cabut tautan berbagi untuk "${link.itemName}"?`,
      {
        title: "Cabut Tautan",
        confirmText: "Ya, Cabut",
        variant: "destructive",
      },
    );
    if (!confirmed) return;
    setActionLoading(link.id);

    // Optimistic update
    setLinks((prev) => prev.filter((l) => l.id !== link.id));

    try {
      const res = await fetch("/api/share/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jti: link.jti, expiresAt: link.expiresAt }),
      });
      if (!res.ok) throw new Error("Failed to revoke");
      await fetchLinks(true);
    } catch {
      await fetchLinks(true);
      addToast({ message: "Gagal mencabut tautan", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (link: ShareLinkItem) => {
    const confirmed = await confirm(
      `Hapus permanen tautan berbagi untuk "${link.itemName}"?`,
      {
        title: "Hapus Tautan",
        confirmText: "Ya, Hapus",
        variant: "destructive",
      },
    );
    if (!confirmed) return;
    setActionLoading(link.id);

    // Optimistic update
    setLinks((prev) => prev.filter((l) => l.id !== link.id));

    try {
      const res = await fetch("/api/share/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: link.id,
          jti: link.jti,
          expiresAt: link.expiresAt,
        }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchLinks(true);
    } catch {
      await fetchLinks(true);
      addToast({ message: "Gagal menghapus tautan", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const getExpiryStatus = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    if (diffMs < 0) return { label: "Expired", class: "text-red-400" };
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24)
      return {
        label: `${Math.ceil(diffHours)}h left`,
        class: "text-amber-400",
      };
    const diffDays = Math.floor(diffHours / 24);
    return { label: `${diffDays}d left`, class: "text-emerald-400" };
  };

  const statusCounts = useMemo(() => {
    const now = new Date();
    const active = links.filter((l) => new Date(l.expiresAt) >= now).length;
    const expired = links.filter((l) => new Date(l.expiresAt) < now).length;
    return { all: links.length, active, expired };
  }, [links]);

  return (
    <PageTransition>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              Share Links
              {isRefetching && (
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              )}
            </h1>
            <p className="text-gray-400 mt-1">
              Kelola semua tautan berbagi yang telah dibuat
            </p>
          </div>
          <a
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Admin Dashboard
          </a>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama, path, atau pembuat..."
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "expired"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  statusFilter === s
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {s === "all" && "Semua"}
                {s === "active" && "Aktif"}
                {s === "expired" && "Kedaluwarsa"}
                <span className="ml-1.5 opacity-60">{statusCounts[s]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : filteredLinks.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Share2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>
              {links.length === 0
                ? "Belum ada tautan berbagi"
                : "Tidak ada tautan yang sesuai filter"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 uppercase text-xs tracking-wider">
                  <th className="text-left py-3 px-2">Item</th>
                  <th className="text-left py-3 px-2 hidden md:table-cell">
                    Path
                  </th>
                  <th className="text-left py-3 px-2 hidden lg:table-cell">
                    Pembuat
                  </th>
                  <th className="text-left py-3 px-2 hidden sm:table-cell">
                    Dilihat
                  </th>
                  <th className="text-left py-3 px-2">Berlaku</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-right py-3 px-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinks.map((link) => {
                  const status = getExpiryStatus(link.expiresAt);
                  const isExpired = new Date(link.expiresAt) < new Date();
                  return (
                    <tr
                      key={link.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-gray-500 shrink-0" />
                          <div className="truncate max-w-[200px]">
                            <span className="text-white font-medium">
                              {link.itemName}
                            </span>
                            {link.isCollection && (
                              <span className="ml-2 text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">
                                koleksi
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 hidden md:table-cell">
                        <code className="text-gray-400 text-xs font-mono truncate max-w-[180px] block">
                          {link.path}
                        </code>
                      </td>
                      <td className="py-3 px-2 hidden lg:table-cell text-gray-400">
                        {link.createdBy || "—"}
                      </td>
                      <td className="py-3 px-2 hidden sm:table-cell text-gray-400">
                        {link.viewCount}
                      </td>
                      <td className="py-3 px-2 text-gray-400 text-xs">
                        {format(new Date(link.expiresAt), "dd MMM yyyy HH:mm", {
                          locale: id,
                        })}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`text-xs font-medium ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleCopyUrl(link)}
                            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                            title="Salin URL"
                          >
                            {copiedId === link.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          {!isExpired && (
                            <button
                              onClick={() => handleRevoke(link)}
                              disabled={actionLoading === link.id}
                              className="p-1.5 hover:bg-amber-900/50 rounded text-gray-400 hover:text-amber-300 transition-colors"
                              title="Cabut"
                            >
                              {actionLoading === link.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Ban className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(link)}
                            disabled={actionLoading === link.id}
                            className="p-1.5 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-300 transition-colors"
                            title="Hapus"
                          >
                            {actionLoading === link.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {!loading && links.length > 0 && (
          <div className="mt-4 text-xs text-gray-500 text-right">
            {filteredLinks.length !== links.length
              ? `${filteredLinks.length} dari ${links.length} tautan`
              : `${links.length} total tautan`}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
