"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Server,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";

export default function SystemHealth() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/admin/system-health");
      if (!res.ok) throw new Error("Failed to fetch system health");
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3">
        <AlertTriangle size={24} />
        <div>
          <p className="font-semibold">Failed to load system health</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Infrastructure Node */}
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-600">
            <Database size={20} />
          </div>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${data?.redis?.status === "connected" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
          >
            {data?.redis?.status === "connected" ? (
              <CheckCircle size={14} />
            ) : (
              <XCircle size={14} />
            )}
            {data?.redis?.status === "connected" ? "Connected" : "Disconnected"}
          </div>
        </div>
        <h3 className="text-muted-foreground text-sm font-medium">
          Redis KV Store
        </h3>
        <p className="text-xl font-bold mt-1">Operational</p>
      </div>

      {/* Google Drive Status */}
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-yellow-500/10 rounded-lg text-yellow-600">
            <Server size={20} />
          </div>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${data?.drive?.status === "connected" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
          >
            {data?.drive?.status === "connected" ? (
              <CheckCircle size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            {data?.drive?.status === "connected"
              ? "API Active"
              : "Disconnected"}
          </div>
        </div>
        <h3 className="text-muted-foreground text-sm font-medium">
          Google Drive Quota
        </h3>
        {data?.drive?.quota ? (
          <div>
            <p className="text-xl font-bold mt-1">
              {(
                (data.drive.quota.usage / data.drive.quota.limit) *
                100
              ).toFixed(1)}
              % Used
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatBytes(data.drive.quota.usage)} /{" "}
              {formatBytes(data.drive.quota.limit)}
            </p>
          </div>
        ) : (
          <p className="text-xl font-bold mt-1">Unknown</p>
        )}
      </div>

      {/* Response Times */}
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-600">
            <Clock size={20} />
          </div>
        </div>
        <h3 className="text-muted-foreground text-sm font-medium mb-3">
          Response Times (API)
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">P50</span>
            <span className="font-mono font-medium">
              {data?.responseTimes?.p50}ms
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">P95</span>
            <span className="font-mono font-medium text-amber-600">
              {data?.responseTimes?.p95}ms
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">P99</span>
            <span className="font-mono font-medium text-red-600">
              {data?.responseTimes?.p99}ms
            </span>
          </div>
        </div>
      </div>

      {/* Error Rates */}
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-red-500/10 rounded-lg text-red-600">
            <Activity size={20} />
          </div>
          {data?.errorRate && (
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium ${data.errorRate.trend > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
            >
              {data.errorRate.trend > 0 ? "↑" : "↓"}{" "}
              {Math.abs(data.errorRate.trend).toFixed(1)}%
            </div>
          )}
        </div>
        <h3 className="text-muted-foreground text-sm font-medium">
          Error Rate (24h)
        </h3>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-bold text-red-600">
            {data?.errorRate?.last24h || 0}
          </p>
          <span className="text-xs text-muted-foreground">errors recorded</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Previous 24h: {data?.errorRate?.prev24h || 0}
        </p>
      </div>
    </div>
  );
}
