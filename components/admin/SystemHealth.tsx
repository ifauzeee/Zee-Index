"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  Loader2,
  Server,
} from "lucide-react";
import type {
  CacheHealthCheckResult,
  GoogleDriveHealthCheckResult,
  HealthCheckResult,
  HealthServicesSnapshot,
} from "@/lib/services/health-service";
import { getErrorMessage } from "@/lib/errors";
import { formatBytes } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface SystemHealthResponse {
  status: "ok" | "error";
  services: HealthServicesSnapshot;
  errorRate: {
    last24h: number;
    previous24h: number;
    trendPercentage: number;
  };
  latency: {
    totalCheckMs: number;
    averageDependencyMs: number;
    fastestDependency: {
      name: keyof HealthServicesSnapshot;
      latency: number;
    };
    slowestDependency: {
      name: keyof HealthServicesSnapshot;
      latency: number;
    };
    dependencies: Record<keyof HealthServicesSnapshot, number>;
  };
  timestamp: string;
}

function renderStatusBadge(
  service: HealthCheckResult | CacheHealthCheckResult | undefined,
  healthyLabel: string,
  fallbackLabel: string,
) {
  if (!service) return null;

  const isHealthy = service.status === "healthy";

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${isHealthy ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
    >
      {isHealthy ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
      {isHealthy ? healthyLabel : fallbackLabel}
    </div>
  );
}

export default function SystemHealth() {
  const t = useTranslations("SystemHealth");
  const [data, setData] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/system-health");
      if (!response.ok) throw new Error(t("fetchFailed"));
      setData(await response.json());
      setError("");
    } catch (error: unknown) {
      setError(getErrorMessage(error, t("fetchFailed")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const database = data?.services.database;
  const cache = data?.services.cache;
  const drive = data?.services.google_drive as
    | GoogleDriveHealthCheckResult
    | undefined;

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
          <p className="font-semibold">{t("loadFailed")}</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-600">
            <Database size={20} />
          </div>
          {renderStatusBadge(database, t("healthy"), t("attention"))}
        </div>
        <h3 className="text-muted-foreground text-sm font-medium">
          {t("database")}
        </h3>
        <p className="text-xl font-bold mt-1">
          {database?.status === "healthy" ? t("online") : t("unavailable")}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {t("latency")} {database?.latency ?? 0}ms
        </p>
      </div>

      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-600">
            <HardDrive size={20} />
          </div>
          {renderStatusBadge(cache, t("healthy"), t("attention"))}
        </div>
        <h3 className="text-muted-foreground text-sm font-medium">
          {t("cache")}
        </h3>
        <p className="text-xl font-bold mt-1 uppercase">
          {cache?.backend || "unknown"}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {t("latency")} {cache?.latency ?? 0}ms
        </p>
      </div>

      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-yellow-500/10 rounded-lg text-yellow-600">
            <Server size={20} />
          </div>
          {renderStatusBadge(drive, t("apiActive"), t("needsSetup"))}
        </div>
        <h3 className="text-muted-foreground text-sm font-medium">
          {t("googleDriveQuota")}
        </h3>
        {drive?.quota && drive.quota.limit > 0 ? (
          <>
            <p className="text-xl font-bold mt-1">
              {t("percentUsed", {
                percent: (
                  (drive.quota.usage / drive.quota.limit) *
                  100
                ).toFixed(1),
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatBytes(drive.quota.usage)} /{" "}
              {formatBytes(drive.quota.limit)}
            </p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold mt-1">
              {drive?.status === "not_configured"
                ? t("notConfigured")
                : t("unknown")}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t("latency")} {drive?.latency ?? 0}ms
            </p>
          </>
        )}
      </div>

      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-600">
            <Clock size={20} />
          </div>
        </div>
        <h3 className="text-muted-foreground text-sm font-medium mb-3">
          {t("healthCheckLatency")}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("total")}</span>
            <span className="font-mono font-medium">
              {data?.latency.totalCheckMs ?? 0}ms
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("average")}</span>
            <span className="font-mono font-medium">
              {data?.latency.averageDependencyMs ?? 0}ms
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fastest")}</span>
            <span className="font-mono font-medium text-emerald-600">
              {data?.latency.fastestDependency.name || t("unknown")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("slowest")}</span>
            <span className="font-mono font-medium text-amber-600">
              {data?.latency.slowestDependency.name || t("unknown")}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-red-500/10 rounded-lg text-red-600">
            <Activity size={20} />
          </div>
          {data?.errorRate ? (
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium ${data.errorRate.trendPercentage > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
            >
              {data.errorRate.trendPercentage > 0 ? t("up") : t("down")}{" "}
              {Math.abs(data.errorRate.trendPercentage).toFixed(1)}%
            </div>
          ) : null}
        </div>
        <h3 className="text-muted-foreground text-sm font-medium">
          {t("errorRate24h")}
        </h3>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-bold text-red-600">
            {data?.errorRate.last24h || 0}
          </p>
          <span className="text-xs text-muted-foreground">
            {t("errorsRecorded")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t("previous24h")} {data?.errorRate.previous24h || 0}
        </p>
      </div>
    </div>
  );
}
