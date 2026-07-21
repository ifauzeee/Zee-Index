"use client";

import dynamic from "next/dynamic";
import React, { useState, useEffect, useMemo } from "react";
import { useAppStore, ShareLink } from "@/lib/store";
import {
  Link as LinkIcon,
  Hourglass,
  Users,
  Activity,
  UploadCloud,
  HardDrive,
  Loader2,
  BarChart3,
  Zap,
  ExternalLink,
  Key,
  Lock,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { AdminStats } from "@/lib/adminStats";
import SystemHealth from "@/components/admin/SystemHealth";
import RealTimeOverview from "@/components/admin/RealTimeOverview";
import StorageIntelligence from "@/components/admin/StorageIntelligence";
import { useTranslations } from "next-intl";

const TodayDownloadsChart = dynamic(
  () => import("@/components/charts/TodayDownloadsChart"),
  { ssr: false },
);
const DayOfWeekChart = dynamic(
  () => import("@/components/charts/DayOfWeekChart"),
  { ssr: false },
);
const LivePerformanceChart = dynamic(
  () => import("@/components/charts/LivePerformanceChart"),
  { ssr: false },
);

export default function AdminSummaryTab() {
  const {
    shareLinks,
    fileRequests,
    addToast,
    fetchShareLinks,
    fetchFileRequests,
    adminEmails,
    fetchAdminEmails,
  } = useAppStore();
  const t = useTranslations("AdminPage");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchShareLinks();
    fetchFileRequests();
    fetchAdminEmails();

    setIsLoadingStats(true);
    fetch("/api/admin/stats")
      .then((res) => {
        if (res.status === 429) {
          throw new Error("Rate limit exceeded");
        }
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStats(data);
      })
      .catch((err) => {
        console.error("Stats fetch error:", err);
        if (err.message !== "Rate limit exceeded") {
          addToast({
            message: t("loadingStatsError", { error: err.message }),
            type: "error",
          });
        }
      })
      .finally(() => setIsLoadingStats(false));
  }, [fetchShareLinks, fetchFileRequests, fetchAdminEmails, addToast, t]);

  const { expiredLinks } = useMemo(() => {
    const now = new Date();
    const active: ShareLink[] = [];
    const expired: ShareLink[] = [];
    (shareLinks || []).forEach((link: ShareLink) => {
      if (new Date(link.expiresAt) > now) {
        active.push(link);
      } else {
        expired.push(link);
      }
    });
    return { activeLinks: active, expiredLinks: expired };
  }, [shareLinks]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <button
          onClick={() => router.push("/admin/share-links")}
          className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <div className="p-3 bg-blue-500/10 rounded-full text-blue-600 mb-3">
            <LinkIcon size={24} />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {t("totalLinks")}
          </p>
          <p className="text-2xl font-bold">{shareLinks.length}</p>
        </button>

        <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="p-3 bg-purple-500/10 rounded-full text-purple-600 mb-3">
            <UploadCloud size={24} />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {t("activeRequests")}
          </p>
          <p className="text-2xl font-bold">
            {fileRequests.filter((r) => r.expiresAt > Date.now()).length}
          </p>
        </div>

        <button
          onClick={() => router.push("/admin/share-links")}
          className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <div className="p-3 bg-red-500/10 rounded-full text-red-600 mb-3">
            <Hourglass size={24} />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {t("expired")}
          </p>
          <p className="text-2xl font-bold">{expiredLinks.length}</p>
        </button>

        <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-600 mb-3">
            <Users size={24} />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {t("totalAdmin")}
          </p>
          <p className="text-2xl font-bold">{adminEmails.length}</p>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => router.push("/admin/share-links")}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border rounded-xl text-sm font-medium hover:bg-accent/50 transition-colors"
        >
          <LinkIcon size={16} className="text-blue-500" />
          Share Links
          <ExternalLink size={12} className="text-muted-foreground" />
        </button>
        <button
          onClick={() => router.push("/admin/api-keys")}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border rounded-xl text-sm font-medium hover:bg-accent/50 transition-colors"
        >
          <Key size={16} className="text-amber-500" />
          API Keys
          <ExternalLink size={12} className="text-muted-foreground" />
        </button>
        <button
          onClick={() => router.push("/admin/audit")}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border rounded-xl text-sm font-medium hover:bg-accent/50 transition-colors"
        >
          <Activity size={16} className="text-purple-500" />
          Audit Trail
          <ExternalLink size={12} className="text-muted-foreground" />
        </button>
        <button
          onClick={() => router.push("/admin/protected-folders")}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border rounded-xl text-sm font-medium hover:bg-accent/50 transition-colors"
        >
          <Lock size={16} className="text-emerald-500" />
          Protected Folders
          <ExternalLink size={12} className="text-muted-foreground" />
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 px-1">
          {t("systemOverview")}
        </h2>
        <div className="space-y-6 mb-8">
          <SystemHealth />
          <RealTimeOverview />
        </div>

        <h2 className="text-xl font-semibold mb-4 px-1">
          {t("statistics") || "Statistics"}
        </h2>
        {isLoadingStats ? (
          <div className="bg-card border rounded-xl p-6 h-64 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm xl:col-span-2">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Zap size={18} className="text-yellow-500 fill-yellow-500" />
                {t("livePerformance") || "Real-time Traffic Monitor"}
              </h3>
              <LivePerformanceChart />
            </div>

            <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
              <h3 className="text-base font-semibold mb-4">
                {t("todaysDownloads")}
              </h3>
              <TodayDownloadsChart data={stats.downloadsToday} />
            </div>

            <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Activity size={18} className="text-primary" /> {t("topUser")}
              </h3>
              <div className="space-y-4">
                {stats.topUsers?.length > 0 ? (
                  stats.topUsers.map((user, idx) => (
                    <div
                      key={user.email}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            idx < 3
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {idx + 1}
                        </span>
                        <span className="truncate font-medium">
                          {user.email}
                        </span>
                      </div>
                      <span className="font-mono text-muted-foreground text-xs bg-muted px-2 py-1 rounded-md">
                        {user.count}x
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    {t("noData")}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm xl:col-span-2">
              <h3 className="text-base font-semibold mb-4">
                {t("weeklyTrend")}
              </h3>
              <DayOfWeekChart data={stats.downloadsByDayOfWeek} />
            </div>

            <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
              <h3 className="text-base font-semibold mb-1 flex items-center gap-2">
                <HardDrive size={18} className="text-amber-500" />
                {t("bandwidthMonthly")}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t("monthlyUsage")}
              </p>
              <div className="space-y-6 pt-2">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">
                      {t("today")}
                    </p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatBytes(stats.bandwidthSummary?.today || 0)}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">
                      {t("totalThisMonth")}
                    </p>
                    <p className="text-xl font-bold text-amber-600">
                      {formatBytes(stats.bandwidthSummary?.thisMonth || 0)}
                    </p>
                  </div>
                </div>

                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-amber-500/10">
                    <div
                      style={{
                        width: `${Math.min(((stats.bandwidthSummary?.thisMonth || 0) / (stats.bandwidthSummary?.thisMonth || 1)) * 100, 100)}%`,
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amber-500"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-2 mt-4">
              <StorageIntelligence stats={stats} />
            </div>

            <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-500" />
                {t("fileTypeDistribution")}
              </h3>
              <div className="space-y-4">
                {stats.fileTypeDistribution?.length > 0 ? (
                  stats.fileTypeDistribution.map((item) => (
                    <div key={item.type} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {item.type}
                        </span>
                        <span className="text-muted-foreground">
                          {t("fileCount", { count: item.count })}
                        </span>
                      </div>
                      <div className="overflow-hidden h-1.5 text-xs flex rounded bg-emerald-500/10">
                        <div
                          style={{
                            width: `${(item.count / stats.fileTypeDistribution[0].count) * 100}%`,
                          }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500"
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    {t("noData")}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border rounded-xl p-6 text-center text-muted-foreground">
            {t("failed")}
          </div>
        )}
      </div>
    </div>
  );
}
