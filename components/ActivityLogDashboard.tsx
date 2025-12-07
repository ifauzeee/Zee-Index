"use client";

import React, { useState, useEffect, useCallback, FC, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  Loader2,
  AlertCircle,
  Upload,
  Download,
  Trash2,
  Pencil,
  Move,
  Copy,
  Share2,
  UserPlus,
  UserMinus,
  LogIn,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  FileSearch,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { ActivityLog, ActivityType } from "@/lib/activityLogger";
import EmptyState from "./EmptyState";

const iconMap: Record<string, React.ElementType> = {
  UPLOAD: Upload,
  DOWNLOAD: Download,
  DELETE: Trash2,
  RENAME: Pencil,
  MOVE: Move,
  COPY: Copy,
  SHARE_LINK_CREATED: Share2,
  SHARE_LINK_DELETED: Share2,
  ADMIN_ADDED: UserPlus,
  ADMIN_REMOVED: UserMinus,
  LOGIN_SUCCESS: LogIn,
  LOGIN_FAILURE: KeyRound,
};

const LogDetail: FC<{ log: ActivityLog }> = ({ log }) => {
  return (
    <ul className="text-xs text-muted-foreground space-y-1 pl-2 mt-2 border-l-2 border-border/50">
      {log.itemName && (
        <li>
          <strong className="text-foreground">Item:</strong> <span className="break-all">{log.itemName}</span>
        </li>
      )}
      {log.userEmail && (
        <li>
          <strong className="text-foreground">Oleh:</strong> {log.userEmail}
        </li>
      )}
      {log.targetUser && (
        <li>
          <strong className="text-foreground">Target:</strong> {log.targetUser}
        </li>
      )}
      {log.status && (
        <li className={log.status === "failure" ? "text-red-500" : "text-green-500"}>
          <strong>Status:</strong> {log.status}
        </li>
      )}
      {log.error && (
        <li className="text-red-500 mt-1 p-2 bg-red-500/5 rounded-md border border-red-500/20">
          <strong>Error:</strong> <span className="break-words whitespace-pre-wrap">{log.error}</span>
        </li>
      )}
    </ul>
  );
};

const LOGS_PER_PAGE = 50;
const ALL_TYPES = "ALL";

const logTypes: ActivityType[] = [
  "UPLOAD",
  "DOWNLOAD",
  "DELETE",
  "RENAME",
  "MOVE",
  "COPY",
  "SHARE_LINK_CREATED",
  "SHARE_LINK_DELETED",
  "ADMIN_ADDED",
  "ADMIN_REMOVED",
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
];

export default function ActivityLogDashboard() {
  const { addToast } = useAppStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<ActivityType | "ALL">(ALL_TYPES);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLogs = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/admin/activity-log?page=${page}&limit=${LOGS_PER_PAGE}`,
        );
        if (!response.ok) throw new Error("Gagal mengambil log.");
        const data = await response.json();

        setLogs(data.logs);
        setTotalPages(data.totalPages);
        setCurrentPage(data.currentPage);
      } catch (err: unknown) {
        addToast({
          message:
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan tidak dikenal.",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchLogs(newPage);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const typeMatch = filterType === ALL_TYPES || log.type === filterType;
      const searchMatch =
        !searchQuery ||
        log.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.targetUser?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.error?.toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && searchMatch;
    });
  }, [logs, filterType, searchQuery]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Log Aktivitas</h2>
        <button 
          onClick={() => fetchLogs(currentPage)}
          className="p-2 hover:bg-accent rounded-full transition-colors"
          title="Refresh Log"
        >
          <Loader2 size={20} className={isLoading ? "animate-spin" : "opacity-0"} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value as ActivityType | "ALL")
          }
          className="w-full sm:w-48 px-3 py-2 rounded-md border bg-transparent focus:ring-2 focus:ring-ring focus:outline-none text-sm"
        >
          <option value={ALL_TYPES}>Semua Tipe</option>
          {logTypes.map((type) => (
            <option key={type} value={type}>
              {type.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <div className="relative flex-grow">
          <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari log (user, item, error...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent text-sm"
          />
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <EmptyState
              icon={AlertCircle}
              title="Tidak Ada Log"
              message="Tidak ada aktivitas yang tercatat atau cocok dengan filter Anda."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredLogs.map((log, index) => {
              const Icon = iconMap[log.type] || AlertCircle;
              return (
                <motion.div
                  key={`${log.timestamp}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                  }}
                  className="p-4 hover:bg-accent/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-full text-primary mt-1 shrink-0">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm sm:text-base break-words">
                          {log.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono shrink-0">
                          {format(
                            new Date(log.timestamp),
                            "dd MMM yyyy, HH:mm:ss",
                            { locale: id },
                          )}
                        </p>
                      </div>
                      <LogDetail log={log} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {totalPages > 1 && !isLoading && (
          <div className="p-4 border-t border-border flex justify-between items-center bg-muted/20">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium rounded-md hover:bg-accent disabled:opacity-50 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={16} />
              Sebelumnya
            </button>
            <span className="text-sm text-muted-foreground">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm font-medium rounded-md hover:bg-accent disabled:opacity-50 flex items-center gap-1 transition-colors"
            >
              Berikutnya
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}