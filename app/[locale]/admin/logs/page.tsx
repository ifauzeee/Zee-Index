"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Loading from "@/components/common/Loading";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ActivityDetails, ActivityType } from "@/lib/activityLogger";

interface LogEntry extends ActivityDetails {
  type: ActivityType;
  timestamp: number;
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { status, data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/admin/logs")
        .then((res) => res.json())
        .then((data) => {
          setLogs(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
        });
    }
  }, [status]);

  if (status === "loading" || isLoading) {
    return <Loading />;
  }

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="text-center py-20 text-red-500">
        <AlertCircle className="h-16 w-16 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="mt-2 text-muted-foreground">
          Hanya admin yang dapat melihat halaman ini.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto py-8"
    >
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-accent transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">Log Aktivitas Sistem</h1>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">
                  Waktu
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Tipe Aksi
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Detail
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Pelaku
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.timestamp + log.type + Math.random()}
                  className="border-b last:border-b-0 hover:bg-accent/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                    {format(new Date(log.timestamp), "dd MMM yyyy, HH:mm:ss", {
                      locale: id,
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
                      {log.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.itemName && (
                      <span>
                        Item: <strong>{log.itemName}</strong>
                      </span>
                    )}
                    {log.targetUser && (
                      <span>
                        Target: <strong>{log.targetUser}</strong>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {log.userEmail || "Sistem / Tautan Publik"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">
            Belum ada aktivitas yang tercatat.
          </p>
        )}
      </div>
    </motion.div>
  );
}
