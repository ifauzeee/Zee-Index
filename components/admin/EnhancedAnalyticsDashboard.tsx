"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  Users,
  TrendingUp,
  Clock,
  Shield,
  AlertTriangle,
  Zap,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface EnhancedAnalytics {
  realtime: {
    activeUsersLast5Min: number;
    requestsLast5Min: number;
    requestsLastHour: number;
  };
  engagement: {
    uniqueUsersToday: number;
    uniqueUsersThisWeek: number;
    uniqueUsersThisMonth: number;
    totalActionsToday: number;
  };
  trends: {
    daily: Array<{
      date: string;
      downloads: number;
      uploads: number;
      views: number;
    }>;
  };
  peakHours: {
    data: Array<{ hour: string; count: number }>;
    peakHour: string;
  };
  health: {
    errorRate: number;
    cacheHitRate: string;
    cacheSize: number;
  };
  activityBreakdown: Record<string, number>;
  securityEvents: Array<{
    type: string;
    userEmail?: string;
    ipAddress?: string;
    timestamp: number;
    severity: string;
  }>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  subtext,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  subtext?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-xl p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-xl font-bold mt-0.5">{value}</p>
          {subtext && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {subtext}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MiniBarChart({
  data,
}: {
  data: Array<{ hour: string; count: number }>;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-[2px] h-16">
      {data.map((d) => (
        <div
          key={d.hour}
          className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-sm transition-colors relative group"
          style={{
            height: `${(d.count / max) * 100}%`,
            minHeight: d.count > 0 ? "2px" : "0px",
          }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover border shadow-sm rounded px-1.5 py-0.5 text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {d.hour}: {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EnhancedAnalyticsDashboard() {
  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useQuery<EnhancedAnalytics>({
    queryKey: ["enhanced-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/enhanced");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p>Failed to load analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">
            Live • Auto-refresh 30s
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Zap}
          label="Active Users (5min)"
          value={analytics.realtime.activeUsersLast5Min}
          color="bg-green-500/10 text-green-600"
          subtext={`${analytics.realtime.requestsLast5Min} requests`}
        />
        <StatCard
          icon={Activity}
          label="Requests/Hour"
          value={analytics.realtime.requestsLastHour}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          icon={Users}
          label="Users Today"
          value={analytics.engagement.uniqueUsersToday}
          color="bg-purple-500/10 text-purple-600"
          subtext={`${analytics.engagement.uniqueUsersThisWeek} this week`}
        />
        <StatCard
          icon={TrendingUp}
          label="Actions Today"
          value={analytics.engagement.totalActionsToday}
          color="bg-amber-500/10 text-amber-600"
        />
      </div>

      {/* Peak Hours Chart */}
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            Hourly Activity (30 days)
          </h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
            Peak: {analytics.peakHours.peakHour}
          </span>
        </div>
        <MiniBarChart data={analytics.peakHours.data} />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </div>

      {/* System Health + Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Health */}
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-500" />
            System Health
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Error Rate</span>
                <span
                  className={`font-mono font-bold ${analytics.health.errorRate > 5 ? "text-red-500" : "text-green-600"}`}
                >
                  {analytics.health.errorRate}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${analytics.health.errorRate > 5 ? "bg-red-500" : "bg-green-500"}`}
                  style={{
                    width: `${Math.min(analytics.health.errorRate, 100)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Cache Hit Rate</span>
                <span className="font-mono font-bold text-blue-600">
                  {analytics.health.cacheHitRate}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Cache Entries</span>
              <span className="font-mono">{analytics.health.cacheSize}</span>
            </div>
          </div>
        </div>

        {/* Activity Breakdown */}
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity size={16} className="text-indigo-500" />
            Today&apos;s Activity
          </h3>
          <div className="space-y-2.5">
            {Object.entries(analytics.activityBreakdown)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground font-medium">
                    {type.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono bg-muted px-2 py-0.5 rounded">
                    {count}
                  </span>
                </div>
              ))}
            {Object.keys(analytics.activityBreakdown).length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No activity yet today
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Security Events */}
      {analytics.securityEvents.length > 0 && (
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Shield size={16} className="text-red-500" />
            Recent Security Events
          </h3>
          <div className="space-y-2">
            {analytics.securityEvents.map((event, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <span className="font-medium truncate">
                    {event.type.replace(/_/g, " ")}
                  </span>
                  {event.userEmail && (
                    <span className="text-muted-foreground truncate">
                      {event.userEmail}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {formatDistanceToNow(event.timestamp, {
                    addSuffix: true,
                    locale: localeId,
                  })}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
