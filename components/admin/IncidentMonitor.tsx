"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Bell,
  Play,
} from "lucide-react";
import { CardSkeleton } from "@/components/admin/skeletons";

type IncidentStatus = "open" | "acknowledged" | "resolved";
type IncidentSeverity = "warning" | "error" | "critical";

interface IncidentRecord {
  id: string;
  ruleId: string;
  fingerprint: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: number;
  updatedAt: number;
  lastTriggeredAt: number;
  triggerCount: number;
  sourceEventIds: string[];
  metadata?: Record<string, unknown>;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  cooldownSeconds: number;
}

interface ListResponse {
  incidents: IncidentRecord[];
  total: number;
  openCount: number;
}

type StatusFilter = "all" | IncidentStatus;

const SEVERITY_CONFIG: Record<
  IncidentSeverity,
  { icon: typeof AlertTriangle; label: string; class: string }
> = {
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    class: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    class: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  },
  critical: {
    icon: AlertOctagon,
    label: "Critical",
    class: "text-red-500 bg-red-500/10 border-red-500/20",
  },
};

const STATUS_CONFIG: Record<IncidentStatus, { label: string; class: string }> =
  {
    open: {
      label: "Open",
      class: "text-red-400 bg-red-900/30 border-red-800/30",
    },
    acknowledged: {
      label: "Acknowledged",
      class: "text-amber-400 bg-amber-900/30 border-amber-800/30",
    },
    resolved: {
      label: "Resolved",
      class: "text-emerald-400 bg-emerald-900/30 border-emerald-800/30",
    },
  };

const ITEMS_PER_PAGE = 20;

export default function IncidentMonitor() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [evalLoading, setEvalLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [offset, setOffset] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: String(ITEMS_PER_PAGE),
        offset: String(offset),
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/incidents?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ListResponse = await res.json();
      setIncidents(data.incidents || []);
      setTotal(data.total || 0);
      setOpenCount(data.openCount || 0);
    } catch {
      setError("Gagal memuat insiden");
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleEvaluate = async () => {
    setEvalLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/incidents/evaluate", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to evaluate");
      await fetchIncidents();
    } catch {
      setError("Gagal menjalankan evaluasi aturan");
    } finally {
      setEvalLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: IncidentStatus) => {
    setActionLoading(id);
    setError("");
    try {
      const res = await fetch("/api/admin/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchIncidents();
    } catch {
      setError("Gagal memperbarui status insiden");
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;

  const goToPage = (page: number) => {
    setOffset((page - 1) * ITEMS_PER_PAGE);
  };

  const handleFilterChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setOffset(0);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Incident Monitor
          </h1>
          <p className="text-gray-400 mt-1">
            Pantau dan kelola insiden keamanan &amp; sistem
          </p>
        </div>
        <div className="flex items-center gap-3">
          {openCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 border border-red-800/30 rounded-lg text-red-300 text-sm">
              <Bell className="w-4 h-4" />
              <span className="font-semibold">{openCount}</span> open
            </div>
          )}
          <button
            onClick={handleEvaluate}
            disabled={evalLoading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
          >
            {evalLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Evaluate Rules
          </button>
          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "open", "acknowledged", "resolved"] as const).map((s) => (
          <button
            key={s}
            onClick={() => handleFilterChange(s)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              statusFilter === s
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {s === "all" && "Semua"}
            {s === "open" && "Open"}
            {s === "acknowledged" && "Acknowledged"}
            {s === "resolved" && "Resolved"}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : incidents.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Tidak ada insiden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => {
            const SevIcon = SEVERITY_CONFIG[inc.severity].icon;
            const statusCfg = STATUS_CONFIG[inc.status];
            const sevCfg = SEVERITY_CONFIG[inc.severity];

            return (
              <div
                key={inc.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${sevCfg.class}`}>
                      <SevIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-semibold">
                          {inc.title}
                        </h3>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sevCfg.class}`}
                        >
                          {SEVERITY_CONFIG[inc.severity].label}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.class}`}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                        {inc.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>
                          Rule:{" "}
                          <code className="text-gray-400 font-mono">
                            {inc.ruleId}
                          </code>
                        </span>
                        <span>
                          Triggered:{" "}
                          {format(
                            new Date(inc.lastTriggeredAt),
                            "dd MMM HH:mm",
                          )}{" "}
                          (x{inc.triggerCount})
                        </span>
                        {inc.acknowledgedBy && (
                          <span>By: {inc.acknowledgedBy}</span>
                        )}
                        {inc.resolvedBy && (
                          <span>Resolved by: {inc.resolvedBy}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {inc.status === "open" && (
                      <button
                        onClick={() =>
                          handleUpdateStatus(inc.id, "acknowledged")
                        }
                        disabled={actionLoading === inc.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === inc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        Acknowledge
                      </button>
                    )}
                    {(inc.status === "open" ||
                      inc.status === "acknowledged") && (
                      <button
                        onClick={() => handleUpdateStatus(inc.id, "resolved")}
                        disabled={actionLoading === inc.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === inc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
          <span className="text-sm text-gray-500">
            {offset + 1}–{Math.min(offset + ITEMS_PER_PAGE, total)} of {total}
            {statusFilter === "all" && (
              <span className="ml-2 text-gray-600">({openCount} open)</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-400 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
