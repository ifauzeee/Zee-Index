"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { format } from "date-fns";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { TableSkeleton } from "@/components/admin/skeletons";
import { useTranslations } from "next-intl";

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revoked: boolean;
}

const AVAILABLE_PERMISSIONS = [
  { id: "*", label: "Full Access" },
  { id: "files:read", label: "Read Files" },
  { id: "files:write", label: "Write Files" },
  { id: "search", label: "Search" },
  { id: "download", label: "Download" },
];

export default function ApiKeyManager() {
  const t = useTranslations();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>(["files:read", "search"]);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const { addToast } = useAppStore();

  const fetchKeys = useCallback(async (isBackground = false) => {
    if (isBackground) setIsRefetching(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/api-keys");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      setError("Gagal memuat API keys");
    } finally {
      if (isBackground) setIsRefetching(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newName.trim() || newPerms.length === 0) return;
    setCreating(true);
    setError("");

    // Optimistic addition
    const tempKey = {
      id: "temp-" + Date.now(),
      name: newName.trim(),
      keyPrefix: "...",
      permissions: [...newPerms],
      lastUsedAt: null,
      expiresAt: null,
      createdAt: new Date().toISOString(),
      revoked: false,
    };
    setKeys((prev) => [tempKey, ...prev]);

    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), permissions: newPerms }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      const data = await res.json();
      setCreatedKey(data.apiKey);
      setNewName("");
      setNewPerms(["files:read", "search"]);
      await fetchKeys(true);
    } catch (err) {
      await fetchKeys(true);
      addToast({
        message: err instanceof Error ? err.message : "Gagal membuat API key",
        type: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Yakin ingin mencabut API key ini?")) return;

    // Optimistic revoke
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, revoked: true } : k)),
    );

    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke");
      await fetchKeys(true);
    } catch {
      await fetchKeys(true);
      addToast({ message: "Gagal mencabut API key", type: "error" });
    }
  };

  const handleCopy = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const togglePerm = (perm: string) => {
    if (perm === "*") {
      setNewPerms(["*"]);
      return;
    }
    setNewPerms((prev) => {
      const withoutStar = prev.filter((p) => p !== "*");
      if (withoutStar.includes(perm)) {
        return withoutStar.filter((p) => p !== perm);
      }
      return [...withoutStar, perm];
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            API Keys
            {isRefetching && (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            )}
          </h1>
          <p className="text-gray-400 mt-1">
            Kelola API keys untuk akses eksternal
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setCreatedKey(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buat Key
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Created key display */}
      {createdKey && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 mb-6 bg-emerald-900/30 border border-emerald-800 rounded-lg"
        >
          <p className="text-emerald-300 font-semibold mb-2">
            API Key berhasil dibuat! Salin sekarang — tidak akan ditampilkan
            lagi.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-black/40 rounded text-sm font-mono text-amber-200 break-all">
              {createdKey}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Create dialog */}
      {showCreate && !createdKey && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 mb-6 bg-gray-800/50 border border-gray-700 rounded-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Buat API Key Baru
            </h3>
            <button
              onClick={() => setShowCreate(false)}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1">Nama</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: CI Script, Backup Service"
              className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">
              Permissions
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_PERMISSIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePerm(p.id)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    newPerms.includes(p.id)
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim() || newPerms.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Buat
          </button>
        </motion.div>
      )}

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : keys.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada API keys</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 uppercase text-xs tracking-wider">
                <th className="text-left py-3 px-2">Nama</th>
                <th className="text-left py-3 px-2">Prefix</th>
                <th className="text-left py-3 px-2">Permissions</th>
                <th className="text-left py-3 px-2">Terakhir Digunakan</th>
                <th className="text-left py-3 px-2">Dibuat</th>
                <th className="text-left py-3 px-2">Status</th>
                <th className="text-right py-3 px-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr
                  key={key.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-3 px-2 text-white">{key.name}</td>
                  <td className="py-3 px-2 font-mono text-gray-400">
                    {key.keyPrefix}...
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-wrap gap-1">
                      {key.permissions.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-400">
                    {key.lastUsedAt
                      ? format(new Date(key.lastUsedAt), "dd MMM HH:mm")
                      : "—"}
                  </td>
                  <td className="py-3 px-2 text-gray-400">
                    {format(new Date(key.createdAt), "dd MMM yyyy")}
                  </td>
                  <td className="py-3 px-2">
                    {key.revoked ? (
                      <span className="text-red-400 text-xs">Revoked</span>
                    ) : (
                      <span className="text-emerald-400 text-xs">Active</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right">
                    {!key.revoked && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="p-1.5 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-300 transition-colors"
                        title="Revoke"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
