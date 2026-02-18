"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import {
    Eye,
    Users,
    TrendingUp,
    Activity,
    Globe,
    Monitor,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    RefreshCw,
    BarChart3,
    FileText,
    Wifi,
    HardDrive,
} from "lucide-react";
import type { AnalyticsData } from "@/lib/analyticsTracker";
import { useTranslations } from "next-intl";

const PageViewsChart = dynamic(
    () => import("@/components/charts/PageViewsChart"),
    { ssr: false },
);
const VisitorsTrendChart = dynamic(
    () => import("@/components/charts/VisitorsTrendChart"),
    { ssr: false },
);
const DeviceBreakdownChart = dynamic(
    () => import("@/components/charts/DeviceBreakdownChart"),
    { ssr: false },
);
const BandwidthChart = dynamic(
    () => import("@/components/charts/BandwidthChart"),
    { ssr: false },
);

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function StatCard({
    icon: Icon,
    label,
    value,
    comparison,
    comparisonLabel,
    color,
    delay = 0,
}: {
    icon: React.ElementType;
    label: string;
    value: number;
    comparison?: number;
    comparisonLabel?: string;
    color: string;
    delay?: number;
}) {
    const diff =
        comparison !== undefined && comparison > 0
            ? Math.round(((value - comparison) / comparison) * 100)
            : 0;
    const isUp = diff >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className="bg-card border rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300"
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${color}`}>
                    <Icon size={20} />
                </div>
                {comparison !== undefined && comparison > 0 && (
                    <div
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isUp
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                    >
                        {isUp ? (
                            <ArrowUpRight size={12} />
                        ) : (
                            <ArrowDownRight size={12} />
                        )}
                        {Math.abs(diff)}%
                    </div>
                )}
            </div>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                {value.toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</p>
            {comparisonLabel && (
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {comparisonLabel}: {comparison?.toLocaleString() || 0}
                </p>
            )}
        </motion.div>
    );
}

export default function AnalyticsDashboard() {
    const { addToast } = useAppStore();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const t = useTranslations("AnalyticsDashboard");

    const fetchAnalytics = useCallback(
        async (showRefresh = false) => {
            if (showRefresh) setIsRefreshing(true);
            else setIsLoading(true);

            try {
                const response = await fetch("/api/admin/analytics");
                if (!response.ok) throw new Error(t("fetchError"));
                const result = await response.json();
                setData(result);
            } catch (err: unknown) {
                addToast({
                    message: err instanceof Error ? err.message : t("unknownError"),
                    type: "error",
                });
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [addToast, t],
    );

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);


    useEffect(() => {
        const interval = setInterval(() => fetchAnalytics(true), 60000);
        return () => clearInterval(interval);
    }, [fetchAnalytics]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("noData")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                        <BarChart3 className="text-primary" size={24} />
                        {t("title")}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
                </div>
                <button
                    onClick={() => fetchAnalytics(true)}
                    disabled={isRefreshing}
                    className="p-2 hover:bg-accent rounded-full transition-colors"
                    title={t("refresh")}
                >
                    <RefreshCw
                        size={18}
                        className={isRefreshing ? "animate-spin" : ""}
                    />
                </button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <StatCard
                    icon={Eye}
                    label={t("viewsToday")}
                    value={data.overview.viewsToday}
                    comparison={data.overview.viewsYesterday}
                    comparisonLabel={t("yesterday")}
                    color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    delay={0}
                />
                <StatCard
                    icon={Users}
                    label={t("visitorsToday")}
                    value={data.overview.visitorsToday}
                    comparison={data.overview.visitorsYesterday}
                    comparisonLabel={t("yesterday")}
                    color="bg-green-500/10 text-green-600 dark:text-green-400"
                    delay={0.05}
                />
                <StatCard
                    icon={Activity}
                    label={t("activeNow")}
                    value={data.overview.activeNow}
                    color="bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    delay={0.1}
                />
                <StatCard
                    icon={TrendingUp}
                    label={t("viewsThisWeek")}
                    value={data.overview.viewsThisWeek}
                    color="bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    delay={0.15}
                />
                <StatCard
                    icon={Globe}
                    label={t("viewsThisMonth")}
                    value={data.overview.viewsThisMonth}
                    color="bg-pink-500/10 text-pink-600 dark:text-pink-400"
                    delay={0.2}
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm"
                >
                    <h3 className="text-base font-semibold mb-1 flex items-center gap-2">
                        <Eye size={16} className="text-blue-500" />
                        {t("todaysTraffic")}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                        {t("todaysTrafficSubtitle")}
                    </p>
                    <PageViewsChart data={data.hourlyViews} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm"
                >
                    <h3 className="text-base font-semibold mb-1 flex items-center gap-2">
                        <TrendingUp size={16} className="text-purple-500" />
                        {t("monthlyTrend")}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                        {t("monthlyTrendSubtitle")}
                    </p>
                    <VisitorsTrendChart data={data.dailyTrend} />
                </motion.div>
            </div>

            {/* Popular Pages & Referrers */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.35 }}
                    className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm"
                >
                    <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                        <FileText size={16} className="text-green-500" />
                        {t("popularPages")}
                    </h3>
                    <div className="space-y-2">
                        {data.popularPages.length > 0 ? (
                            data.popularPages.map((page, idx) => (
                                <div
                                    key={page.path}
                                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span
                                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 3
                                                ? "bg-primary/10 text-primary"
                                                : "bg-muted text-muted-foreground"
                                                }`}
                                        >
                                            {idx + 1}
                                        </span>
                                        <span className="text-sm truncate font-medium">
                                            {page.path === "/" ? "Home" : page.path}
                                        </span>
                                    </div>
                                    <span className="font-mono text-muted-foreground text-xs bg-muted px-2 py-1 rounded-md shrink-0 ml-2">
                                        {page.views.toLocaleString()} views
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-sm text-center py-8">
                                {t("noData")}
                            </p>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm"
                >
                    <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                        <Wifi size={16} className="text-indigo-500" />
                        {t("topReferrers")}
                    </h3>
                    <div className="space-y-2">
                        {data.topReferrers.length > 0 ? (
                            data.topReferrers.map((ref, idx) => (
                                <div
                                    key={ref.source}
                                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span
                                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 3
                                                ? "bg-indigo-500/10 text-indigo-600"
                                                : "bg-muted text-muted-foreground"
                                                }`}
                                        >
                                            {idx + 1}
                                        </span>
                                        <span className="text-sm truncate font-medium">
                                            {ref.source}
                                        </span>
                                    </div>
                                    <span className="font-mono text-muted-foreground text-xs bg-muted px-2 py-1 rounded-md shrink-0 ml-2">
                                        {ref.count.toLocaleString()} visits
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-sm text-center py-8">
                                {t("noReferrers")}
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Device Breakdown */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.45 }}
                className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm"
            >
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <Monitor size={16} className="text-cyan-500" />
                    {t("deviceBreakdown")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2 text-center">
                            {t("browser")}
                        </p>
                        <DeviceBreakdownChart
                            data={data.deviceBreakdown.browsers}
                            title={t("browser")}
                        />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2 text-center">
                            {t("operatingSystem")}
                        </p>
                        <DeviceBreakdownChart
                            data={data.deviceBreakdown.os}
                            title={t("operatingSystem")}
                        />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2 text-center">
                            {t("deviceType")}
                        </p>
                        <DeviceBreakdownChart
                            data={data.deviceBreakdown.devices}
                            title={t("deviceType")}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Bandwidth */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <HardDrive size={16} className="text-amber-500" />
                        {t("bandwidthUsage")}
                    </h3>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            {t("today")}: {formatBytes(data.bandwidth.totalToday)}
                        </span>
                        <span className="hidden sm:flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            {t("week")}: {formatBytes(data.bandwidth.totalThisWeek)}
                        </span>
                        <span className="hidden md:flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            {t("month")}: {formatBytes(data.bandwidth.totalThisMonth)}
                        </span>
                    </div>
                </div>
                <BandwidthChart data={data.bandwidth.dailyTrend} />
            </motion.div>
        </div>
    );
}
