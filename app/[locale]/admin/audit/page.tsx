"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  Shield,
  Clock,
  User,
  Globe,
  FileText,
  Trash2,
  RefreshCw,
  Search,
  Download,
  Upload,
  LogIn,
  Pencil,
  Move,
  Copy,
  Share2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ScrollText,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import EmptyState from "@/components/file-browser/EmptyState";

interface AuditLog {
  id: string;
  type: string;
  timestamp: number;
  severity: string;
  userEmail?: string;
  itemName?: string;
  itemId?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: string;
  error?: string;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  DOWNLOAD: Download,
  UPLOAD: Upload,
  DELETE: Trash2,
  RENAME: Pencil,
  MOVE: Move,
  COPY: Copy,
  SHARE_LINK_CREATED: Share2,
  SHARE_LINK_DELETED: Share2,
  LOGIN_SUCCESS: LogIn,
  LOGIN_FAILURE: LogIn,
};

const ACTION_COLORS: Record<string, string> = {
  DOWNLOAD: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  UPLOAD: "bg-green-500/10 text-green-600 dark:text-green-400",
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
  RENAME: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  MOVE: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  COPY: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  SHARE_LINK_CREATED: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  SHARE_LINK_DELETED: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  LOGIN_SUCCESS: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  LOGIN_FAILURE: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const LOGS_PER_PAGE = 15;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function AuditDashboard() {
  const { status } = useSession();
  const { addToast } = useAppStore();
  const t = useTranslations("AuditDashboard");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit");
      if (res.ok) {
        const data: AuditLog[] = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLogs = useCallback(async () => {
    if (!confirm(t("clearConfirm"))) return;
    try {
      const res = await fetch("/api/admin/audit", { method: "DELETE" });
      if (res.ok) {
        setLogs([]);
        setCurrentPage(1);
        addToast({ message: t("cleared"), type: "success" });
      }
    } catch {
      addToast({ message: t("clearFailed"), type: "error" });
    }
  }, [addToast, t]);

  useEffect(() => {
    if (status === "authenticated") fetchLogs();
  }, [status, fetchLogs]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.userEmail?.toLowerCase().includes(q) ||
        log.type?.toLowerCase().includes(q) ||
        log.itemName?.toLowerCase().includes(q) ||
        log.itemId?.toLowerCase().includes(q) ||
        log.ipAddress?.includes(q),
    );
  }, [logs, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / LOGS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLogs = filteredLogs.slice(
    (safePage - 1) * LOGS_PER_PAGE,
    safePage * LOGS_PER_PAGE,
  );

  const getActionIcon = (action: string) => ACTION_ICONS[action] || FileText;
  const getActionColor = (action: string) =>
    ACTION_COLORS[action] || "bg-muted text-muted-foreground";

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="py-6 space-y-8"
    >
      {/* ── Header ── */}
      <motion.div variants={item}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-sm">
            <ScrollText size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div variants={item}>
        <div className="bg-card border rounded-2xl shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-muted-foreground/30"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all text-sm font-medium disabled:opacity-50 active:scale-[0.98]"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">{t("refresh")}</span>
              </button>
              <button
                onClick={clearLogs}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium active:scale-[0.98]"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">{t("clearLogs")}</span>
              </button>
            </div>
          </div>
          {filteredLogs.length > 0 && (
            <p className="text-[11px] text-muted-foreground/60 mt-3 ml-1">
              {filteredLogs.length === logs.length
                ? `${logs.length} log entries`
                : `${filteredLogs.length} of ${logs.length} log entries`}
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Table Card ── */}
      <motion.div variants={item}>
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="animate-spin h-6 w-6" />
                <span className="text-sm">{t("loading")}</span>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={searchQuery ? Search : Shield}
                title={searchQuery ? t("noResults") : t("empty")}
                message={searchQuery ? t("noResultsMessage") : t("empty")}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                      <th className="px-5 py-4">{t("time")}</th>
                      <th className="px-5 py-4">{t("user")}</th>
                      <th className="px-5 py-4">{t("action")}</th>
                      <th className="px-5 py-4">{t("fileFolder")}</th>
                      <th className="px-5 py-4">{t("ipDevice")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedLogs.map((log, i) => {
                      const ActionIcon = getActionIcon(log.type);
                      return (
                        <motion.tr
                          key={`${String(log.timestamp)}-${log.userEmail}-${i}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.25,
                            delay: i * 0.03,
                            ease: "easeOut",
                          }}
                          className="hover:bg-muted/40 transition-colors"
                        >
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock size={12} className="shrink-0" />
                              <span className="text-xs font-mono">
                                {format(
                                  new Date(log.timestamp),
                                  "MMM d, HH:mm:ss",
                                )}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-md bg-primary/10 text-primary">
                                <User size={13} />
                              </div>
                              <span className="text-sm font-medium">
                                {log.userEmail}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${getActionColor(log.type)}`}
                            >
                              <ActionIcon size={11} />
                              {log.type.replace(/_/g, " ")}
                            </span>
                          </td>

                          <td className="px-5 py-4 max-w-[200px]">
                            <div className="flex items-center gap-2">
                              <FileText
                                size={13}
                                className="shrink-0 text-muted-foreground/50"
                              />
                              <span
                                className="text-sm truncate"
                                title={log.itemName || log.itemId}
                              >
                                {log.itemName || log.itemId || "—"}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Globe
                                  size={11}
                                  className="shrink-0 text-muted-foreground/60"
                                />
                                <span className="text-xs font-mono">
                                  {log.ipAddress}
                                </span>
                              </div>
                              <span
                                className="text-[10px] text-muted-foreground/50 max-w-[160px] truncate"
                                title={log.userAgent}
                              >
                                {log.userAgent}
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t bg-muted/20">
                  <button
                    onClick={() => goToPage(safePage - 1)}
                    disabled={safePage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-accent disabled:opacity-40 transition-colors active:scale-[0.97]"
                  >
                    <ChevronLeft size={16} />
                    {t("prev")}
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {t("pageInfo", {
                      current: safePage,
                      total: totalPages,
                    })}
                  </span>
                  <button
                    onClick={() => goToPage(safePage + 1)}
                    disabled={safePage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-accent disabled:opacity-40 transition-colors active:scale-[0.97]"
                  >
                    {t("next")}
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
