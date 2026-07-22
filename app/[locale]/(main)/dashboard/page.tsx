"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import {
  Clock,
  Download,
  Star,
  HardDrive,
  LogIn,
  Loader2,
  FileText,
  User,
  Activity,
  ArrowRight,
  Home,
  Folder,
  LayoutDashboard,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { DashboardSkeleton } from "@/components/common/skeletons/DashboardSkeleton";
import EmptyState from "@/components/file-browser/EmptyState";
import { getDashboardData } from "@/app/actions/dashboard";
import { getFavorites } from "@/app/actions/favorites";
import type { DriveFile } from "@/lib/drive";

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  DOWNLOAD: Download,
  UPLOAD: FileText,
  SHARE_LINK_CREATED: ArrowRight,
  SHARE_LINK_ACCESSED: ArrowRight,
  LOGIN_SUCCESS: LogIn,
  RENAME: FileText,
  MOVE: FileText,
  DELETE: FileText,
};

function ActivityIcon({ type }: { type: string }) {
  const Icon = ACTIVITY_ICONS[type] || Activity;
  return <Icon size={16} />;
}

function formatTimestamp(ts: number, locale: string): string {
  const date = new Date(ts);
  const now = Date.now();
  const diff = now - ts;

  if (diff < 60_000) return locale === "id" ? "Baru saja" : "Just now";
  if (diff < 3_600_000) {
    const m = Math.floor(diff / 60_000);
    return locale === "id" ? `${m} mnt lalu` : `${m}m ago`;
  }
  if (diff < 86_400_000) {
    const h = Math.floor(diff / 3_600_000);
    return locale === "id" ? `${h} jam lalu` : `${h}h ago`;
  }
  return date.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

function ActivityBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    DOWNLOAD: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    UPLOAD: "bg-green-500/10 text-green-600 dark:text-green-400",
    SHARE_LINK_CREATED: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    SHARE_LINK_ACCESSED:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    LOGIN_SUCCESS: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    RENAME: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    MOVE: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider shrink-0 ${
        colors[type] || "bg-muted text-muted-foreground"
      }`}
    >
      {type.replace(/_/g, " ")}
    </span>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const statItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, dataUsage } = useAppStore();
  const t = useTranslations("DashboardPage");
  const locale =
    typeof window !== "undefined"
      ? window.location.pathname.match(/^\/(en|id|zh-TW)\/?/)?.[1] || "en"
      : "en";

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardData,
    enabled: !!user && !user.isGuest,
  });

  const { data: favoriteFiles = [], isLoading: favLoading } = useQuery<
    DriveFile[]
  >({
    queryKey: ["favorites"],
    queryFn: getFavorites,
    enabled: !!user && !user.isGuest,
    initialData: [],
  });

  const recentActivity = dashData?.recentActivity?.slice(0, 10) || [];
  const downloadCount = dashData?.downloadCount || 0;
  const storageUsage = dashData?.storageUsage || dataUsage.value;

  const createSlug = (name: string) =>
    encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());

  const handleFileClick = useCallback(
    (file: DriveFile) => {
      const parentFolder = file.parents?.[0];
      if (file.isFolder) {
        router.push(`/folder/${file.id}`);
      } else if (parentFolder) {
        router.push(
          `/folder/${parentFolder}/file/${file.id}/${createSlug(file.name)}`,
        );
      }
    },
    [router],
  );

  if (!user || user.isGuest) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-6"
      >
        <h1 className="text-2xl font-bold mb-8">{t("title")}</h1>
        <EmptyState
          icon={LogIn}
          title={t("requireAccountTitle")}
          message={t("requireAccountMessage")}
        />
      </motion.div>
    );
  }

  if (dashLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="py-6 space-y-8"
    >
      {/* ── Header ── */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-sm">
              <LayoutDashboard size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {t("welcome", {
                  name: user.name || user.email?.split("@")[0] || "",
                })}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          {user.role && (
            <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize tracking-wide">
              {user.role.toLowerCase()}
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <motion.div
        variants={statItem}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            key: "downloads",
            icon: Download,
            label: t("downloads"),
            value: String(downloadCount),
            chipClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            ringClass: "ring-blue-500/20",
          },
          {
            key: "favorites",
            icon: Star,
            label: t("favorites"),
            value: favLoading ? "—" : String(favoriteFiles.length),
            chipClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            ringClass: "ring-amber-500/20",
          },
          {
            key: "activities",
            icon: Activity,
            label: t("activities"),
            value: String(recentActivity.length),
            chipClass:
              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            ringClass: "ring-emerald-500/20",
          },
          {
            key: "storage",
            icon: HardDrive,
            label: t("storageUsage"),
            value: storageUsage,
            chipClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
            ringClass: "ring-violet-500/20",
          },
        ].map((stat) => (
          <div
            key={stat.key}
            className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div
              className={`inline-flex p-2.5 rounded-xl ${stat.chipClass} ring-1 ${stat.ringClass} mb-4`}
            >
              <stat.icon size={20} />
            </div>
            <p className="text-sm text-muted-foreground font-medium mb-1">
              {stat.label}
            </p>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Activity + Favorites ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity — Timeline list */}
        <motion.div variants={item}>
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 flex items-center justify-between border-b bg-muted/30">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <Clock size={16} className="text-muted-foreground" />
                {t("recentActivity")}
              </h2>
              {recentActivity.length > 0 && (
                <button
                  onClick={() => router.push("/admin/audit")}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  {t("viewAll")}
                  <ArrowRight size={12} />
                </button>
              )}
            </div>

            {recentActivity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title={t("noActivityTitle")}
                message={t("noActivityMessage")}
              />
            ) : (
              <div>
                {recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
                      <ActivityIcon type={log.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {log.itemName || log.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTimestamp(log.timestamp, locale)}
                      </p>
                    </div>
                    <ActivityBadge type={log.type} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Favorites — Card grid */}
        <motion.div variants={item}>
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 flex items-center justify-between border-b bg-muted/30">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <Star size={16} className="text-amber-500" />
                {t("favorites")}
              </h2>
              {favoriteFiles.length > 0 && (
                <button
                  onClick={() => router.push("/favorites")}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  {t("viewAll")}
                  <ArrowRight size={12} />
                </button>
              )}
            </div>

            {favLoading ? (
              <div className="p-4 grid grid-cols-2 gap-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/60"
                  >
                    <div className="w-9 h-9 rounded-lg shimmer shrink-0 bg-muted" />
                    <div className="flex-1 min-w-0">
                      <div className="h-3 w-1/2 shimmer rounded-md mb-2 bg-muted" />
                      <div className="h-2 w-1/3 shimmer rounded-md bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : favoriteFiles.length === 0 ? (
              <EmptyState
                icon={Star}
                title={t("noFavoritesTitle")}
                message={t("noFavoritesMessage")}
              />
            ) : (
              <div className="p-4 grid grid-cols-2 gap-2.5">
                {favoriteFiles.slice(0, 8).map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-border hover:bg-accent/30 transition-all text-sm text-left group"
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 transition-colors ${
                        file.isFolder
                          ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500/15"
                          : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                      }`}
                    >
                      {file.isFolder ? (
                        <Folder size={14} />
                      ) : (
                        <FileText size={14} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium leading-snug">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {file.isFolder
                          ? t("folder")
                          : file.mimeType?.split("/")[1]?.toUpperCase() ||
                            t("file")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Quick Links ── */}
      <motion.div variants={item}>
        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
            {t("quickLinks")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: t("home"),
                icon: Home,
                href: "/",
                chipClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
              },
              {
                label: t("favorites"),
                icon: Star,
                href: "/favorites",
                chipClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              },
              {
                label: t("profile"),
                icon: User,
                href: "/profile",
                chipClass:
                  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
              },
              {
                label: t("storage"),
                icon: HardDrive,
                href: "/storage",
                chipClass:
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              },
            ].map((link) => (
              <button
                key={link.label}
                onClick={() => router.push(link.href)}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 hover:border-border hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 text-sm font-medium group"
              >
                <div
                  className={`p-2 rounded-lg transition-colors ${link.chipClass} group-hover:scale-105 transition-transform`}
                >
                  <link.icon size={16} />
                </div>
                <span>{link.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
