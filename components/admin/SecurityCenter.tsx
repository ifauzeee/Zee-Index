"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Siren,
} from "lucide-react";
import { format } from "date-fns";
import { useAppStore } from "@/lib/store";
import { useTranslations } from "next-intl";

type IncidentStatus = "open" | "acknowledged" | "resolved";
type IncidentSeverity = "warning" | "error" | "critical";

interface Incident {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: number;
  updatedAt: number;
  triggerCount: number;
}

interface SecurityEvent {
  id: string;
  type: string;
  userEmail?: string;
  ipAddress?: string;
  timestamp: number;
}

function severityClasses(severity: IncidentSeverity): string {
  if (severity === "critical") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  }
  if (severity === "error") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }
  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
}

function statusClasses(status: IncidentStatus): string {
  if (status === "resolved") {
    return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  }
  if (status === "acknowledged") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  }
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
}

export default function SecurityCenter() {
  const t = useTranslations("SecurityCenter");
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [updatingIncidentId, setUpdatingIncidentId] = useState<string | null>(
    null,
  );
  const addToast = useAppStore((state) => state.addToast);

  const fetchSecurityData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, incidentsRes] = await Promise.all([
        fetch("/api/admin/logs/security"),
        fetch("/api/admin/incidents?limit=20&status=all"),
      ]);

      if (eventsRes.ok) {
        const eventsPayload = await eventsRes.json();
        setSecurityEvents(
          Array.isArray(eventsPayload)
            ? eventsPayload
            : eventsPayload.logs || [],
        );
      }

      if (incidentsRes.ok) {
        const incidentsPayload = await incidentsRes.json();
        setIncidents(incidentsPayload.incidents || []);
        setOpenCount(incidentsPayload.openCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch security data", err);
      addToast({
        message: t("loadFailed"),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const runEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const response = await fetch("/api/admin/incidents/evaluate", {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || t("evaluationFailed"));
      }

      addToast({
        message: t("evaluationDone", {
          created: payload.summary.createdIncidents,
          updated: payload.summary.updatedIncidents,
        }),
        type: "success",
      });
      await fetchSecurityData();
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : t("evaluationFailed"),
        type: "error",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const updateIncidentStatus = async (id: string, status: IncidentStatus) => {
    setUpdatingIncidentId(id);
    try {
      const response = await fetch("/api/admin/incidents", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || t("updateFailed"));
      }

      setIncidents((prev) =>
        prev.map((incident) =>
          incident.id === id ? (payload.incident as Incident) : incident,
        ),
      );
      addToast({
        message: t("incidentMarked", { status }),
        type: "success",
      });
      await fetchSecurityData();
    } catch (err: unknown) {
      addToast({
        message:
          err instanceof Error
            ? err.message
            : "Failed to update incident status.",
        type: "error",
      });
    } finally {
      setUpdatingIncidentId(null);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-5 border-b pb-3">
          <div className="flex items-center gap-3">
            <Siren className="text-red-500" size={22} />
            <div>
              <h3 className="font-bold text-lg">{t("incidentCenter")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("incidentSubtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={runEvaluation}
            disabled={isEvaluating}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs hover:bg-accent disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={isEvaluating ? "animate-spin" : undefined}
            />
            {t("evaluateRules")}
          </button>
        </div>

        <div className="mb-4 p-3 rounded-lg bg-muted/30 border text-sm flex items-center justify-between">
          <span className="text-muted-foreground">{t("openIncidents")}</span>
          <span className="font-semibold text-foreground">{openCount}</span>
        </div>

        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="animate-spin text-muted-foreground/60" />
            </div>
          ) : incidents.length > 0 ? (
            incidents.map((incident) => {
              const canResolve = incident.status !== "resolved";
              const canAck = incident.status === "open";
              return (
                <div
                  key={incident.id}
                  className="p-3 border rounded-lg hover:bg-muted/20 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {incident.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {incident.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full ${severityClasses(incident.severity)}`}
                      >
                        {incident.severity.toUpperCase()}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusClasses(incident.status)}`}
                      >
                        {incident.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
                    <span>
                      {t("rule")} {incident.ruleId}
                    </span>
                    <span>
                      {t("count")} {incident.triggerCount}
                    </span>
                    <span>
                      {t("last")}{" "}
                      {format(new Date(incident.updatedAt), "dd MMM HH:mm:ss")}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      disabled={!canAck || updatingIncidentId === incident.id}
                      onClick={() =>
                        updateIncidentStatus(incident.id, "acknowledged")
                      }
                      className="px-2.5 py-1.5 text-xs rounded-md border hover:bg-accent disabled:opacity-50"
                    >
                      {t("acknowledge")}
                    </button>
                    <button
                      disabled={
                        !canResolve || updatingIncidentId === incident.id
                      }
                      onClick={() =>
                        updateIncidentStatus(incident.id, "resolved")
                      }
                      className="px-2.5 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {t("resolve")}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
              <ShieldCheck
                className="mx-auto mb-2 opacity-60 text-green-500"
                size={30}
              />
              <p className="text-sm">{t("noIncidents")}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-5 border-b pb-3">
          <ShieldAlert className="text-red-500" size={24} />
          <div>
            <h3 className="font-bold text-lg">{t("recentEvents")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("recentEventsSubtitle")}
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="animate-spin text-muted-foreground/60" />
            </div>
          ) : securityEvents.length > 0 ? (
            securityEvents.map((event) => (
              <div
                key={event.id}
                className="flex gap-3 text-sm p-3 border rounded-lg hover:bg-muted/20 transition-colors"
              >
                <AlertCircle
                  className="text-red-500 mt-0.5 shrink-0"
                  size={16}
                />
                <div>
                  <p className="font-medium text-foreground">
                    {event.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-all">
                    {t("user")}{" "}
                    {event.userEmail || event.ipAddress || t("unknown")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(event.timestamp), "dd MMM, HH:mm:ss")}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
              <CheckCircle2
                className="mx-auto mb-2 opacity-60 text-green-500"
                size={30}
              />
              <p className="text-sm">{t("noAnomalies")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
