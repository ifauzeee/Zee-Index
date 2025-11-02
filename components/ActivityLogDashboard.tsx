"use client";

import React, { useState, useEffect, useCallback, FC } from "react";
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
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import type { ActivityLog } from "@/lib/activityLogger";

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
    <ul className="text-xs text-muted-foreground space-y-1 pl-2">
      {log.itemName && (
        <li>
          <strong>Item:</strong> {log.itemName}
        </li>
      )}
      {log.userEmail && (
        <li>
          <strong>Oleh:</strong> {log.userEmail}
        </li>
      )}
      {log.targetUser && (
        <li>
          <strong>Target:</strong> {log.targetUser}
        </li>
      )}
      {log.status && (
        <li
          className={
            log.status === "failure" ? "text-red-500" : "text-green-500"
          }
        >
          <strong>Status:</strong> {log.status}
        </li>
      )}
      {log.error && (
        <li className="text-red-500">
          <strong>Error:</strong> {log.error}
        </li>
      )}
    </ul>
  );
};

export default function ActivityLogDashboard() {
  const { addToast } = useAppStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchLogs = useCallback(
    async (currentOffset: number) => {
      if (currentOffset === 0) setIsLoading(true);
      else setIsLoadingMore(true);

      try {
        const response = await fetch(
          `/api/admin/activity-log?offset=${currentOffset}`,
        );
        if (!response.ok) throw new Error("Gagal mengambil log.");
        const data = await response.json();

        setLogs((prev) =>
          currentOffset === 0 ? data.logs : [...prev, ...data.logs],
        );
        setHasMore(data.hasMore);
        setOffset(currentOffset + data.logs.length);
      } catch (err: any) {
        addToast({ message: err.message, type: "error" });
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchLogs(offset);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Log Aktivitas</h2>
      <div className="bg-card border rounded-lg">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <AlertCircle className="h-16 w-16 mx-auto mb-4" />
            <p>Belum ada aktivitas yang tercatat.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log, index) => {
              const Icon = iconMap[log.type] || AlertCircle;
              return (
                <motion.div
                  key={`${log.timestamp}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index < 10 ? index * 0.05 : 0,
                  }}
                  className="p-4 hover:bg-accent/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-full text-primary mt-1">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">
                          {log.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
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
        {hasMore && !isLoading && (
          <div className="p-4 border-t border-border text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent disabled:opacity-50"
            >
              {isLoadingMore ? (
                <Loader2 className="animate-spin mx-auto" />
              ) : (
                "Muat Lebih Banyak"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}