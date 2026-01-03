"use client";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Loading from "@/components/common/Loading";
import { formatBytes, getIcon } from "@/lib/utils";
import type { DriveFile } from "@/lib/drive";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import {
  FileText,
  AlertCircle,
  PieChart as PieChartIcon,
  Trash2,
  Copy,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface BreakdownItem {
  type: string;
  count: number;
  size: number;
  [key: string]: string | number;
}

interface StorageDetails {
  usage: number;
  trashUsage: number;
  limit: number;
  breakdown: BreakdownItem[];
  largestFiles: DriveFile[];
  duplicates: DriveFile[][];
  oldestFiles: DriveFile[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const chartColors = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  const t = useTranslations("StoragePage");
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border text-popover-foreground p-3 rounded-lg shadow-xl text-sm">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: data.fill }}
          />
          {data.type}
        </p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            {t("size")}{" "}
            <span className="text-foreground font-medium">
              {formatBytes(data.size)}
            </span>
          </p>
          <p>
            {t("count")}{" "}
            <span className="text-foreground font-medium">{data.count}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

function StoragePageContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("StoragePage");
  const shareToken = searchParams.get("share_token");

  const createSlug = (name: string) =>
    encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());

  const { data, isLoading, error } = useQuery<StorageDetails>({
    queryKey: ["storageDetails"],
    queryFn: async () => {
      const response = await fetch("/api/storage-details");
      if (!response.ok) {
        throw new Error(t("loadError"));
      }
      return response.json();
    },
  });

  if (isLoading) return <Loading />;
  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">
          {t("errorTitle")}
        </h3>
        <p className="text-muted-foreground mt-2">
          {error instanceof Error ? error.message : t("unknownError")}
        </p>
      </div>
    );
  if (!data) return null;

  const usagePercentage = data.limit > 0 ? (data.usage / data.limit) * 100 : 0;
  const freeSpace = Math.max(0, data.limit - data.usage);

  const chartData = data.breakdown.map((item, index) => ({
    ...item,
    fill: chartColors[index % chartColors.length],
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6"
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm w-full lg:w-[450px]">
          <div className="flex justify-between items-end mb-3">
            <div>
              <span className="text-3xl font-bold text-foreground">
                {usagePercentage.toFixed(0)}%
              </span>
              <span className="text-muted-foreground ml-1.5 text-sm">
                {t("used")}
              </span>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-0.5">
                {t("totalCapacity")}
              </div>
              <div className="font-medium text-foreground text-sm">
                {formatBytes(data.limit)}
              </div>
            </div>
          </div>

          <div className="relative w-full bg-muted/50 rounded-full h-3 overflow-hidden mb-3">
            <motion.div
              className="absolute left-0 top-0 h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.3)]"
              initial={{ width: "0%" }}
              animate={{ width: `${usagePercentage}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>

          <div className="flex justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">
                {formatBytes(data.usage)} {t("used")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-muted" />
              <span className="text-muted-foreground">
                {formatBytes(freeSpace)} {t("available")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Charts & Usage */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-6">
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-muted-foreground" />
              {t("fileDistribution")}
            </h2>
            <div className="h-[250px] w-full relative min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="size"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{t("total")}</p>
                  <p className="text-lg font-bold">
                    {data.breakdown.reduce((acc, item) => acc + item.count, 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {chartData.map((item) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-muted/40"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="truncate font-medium">{item.type}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-[10px] ml-1">
                    {formatBytes(item.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-50/50 dark:bg-red-950/10 rounded-xl p-6 border border-red-100 dark:border-red-900/20 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
                {t("trashUsage")}
              </h3>
              <Link
                href="/trash"
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
              >
                {t("emptyTrash")}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-700 dark:text-red-300">
                {formatBytes(data.trashUsage)}
              </div>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                {t("wastedSpace", { size: formatBytes(data.trashUsage) })}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Insights Tabs */}
        <div className="lg:col-span-8">
          <Tabs defaultValue="largest" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="largest" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t("largestFiles")}
              </TabsTrigger>
              <TabsTrigger
                value="duplicates"
                className="flex items-center gap-2"
                disabled={!data.duplicates || data.duplicates.length === 0}
              >
                <Copy className="w-4 h-4" />
                {t("potentialDuplicates")}
                {data.duplicates && data.duplicates.length > 0 && (
                  <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                    {data.duplicates.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="oldest"
                className="flex items-center gap-2"
                disabled={!data.oldestFiles || data.oldestFiles.length === 0}
              >
                <Clock className="w-4 h-4" />
                {t("oldestFiles")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="largest" className="mt-0">
              <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-muted/30">
                  <h3 className="font-semibold text-sm">
                    {t("largestFiles")} ({data.largestFiles.length})
                  </h3>
                </div>
                <div className="">
                  {data.largestFiles.length > 0 ? (
                    data.largestFiles.map((file, idx) => {
                      const Icon = getIcon(file.mimeType);
                      return (
                        <div
                          key={file.id}
                          className={cn(
                            "group flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors",
                            idx !== data.largestFiles.length - 1 && "border-b",
                          )}
                        >
                          <div className="p-2 bg-muted/50 rounded-lg text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                            <Icon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {shareToken ? (
                              <span className="font-medium truncate block text-sm">
                                {file.name}
                              </span>
                            ) : (
                              <Link
                                href={`/folder/${file.parents?.[0]}/file/${file.id}/${createSlug(file.name)}`}
                                className="font-medium truncate block text-sm hover:underline hover:text-primary"
                              >
                                {file.name}
                              </Link>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>
                                {new Date(
                                  file.modifiedTime ?? "",
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono text-sm font-medium">
                              {formatBytes(Number(file.size))}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      {t("noFilesFound")}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="duplicates" className="mt-0">
              <div className="space-y-4">
                {data.duplicates?.map((group, idx) => {
                  const wasted = Number(group[0].size) * (group.length - 1);
                  return (
                    <div
                      key={idx}
                      className="bg-card border rounded-xl overflow-hidden shadow-sm"
                    >
                      <div className="bg-orange-50/50 dark:bg-orange-950/10 p-3 flex justify-between items-center border-b border-orange-100 dark:border-orange-900/20">
                        <div className="flex items-center gap-2">
                          <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-bold px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800">
                            {group.length} copies
                          </span>
                          <span className="font-medium text-sm truncate max-w-[300px]">
                            {group[0].name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-red-500">
                          {t("wastedSpace", { size: formatBytes(wasted) })}
                        </span>
                      </div>
                      <div className="divide-y">
                        {group.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 hover:bg-muted/20 text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground font-mono">
                                {new Date(
                                  file.createdTime,
                                ).toLocaleDateString()}
                              </span>
                              <span className="text-muted-foreground">·</span>
                              <Link
                                href={`/folder/${file.parents?.[0]}/file/${file.id}/${createSlug(file.name)}`}
                                className="hover:underline hover:text-primary truncate max-w-[400px]"
                              >
                                {file.name}
                              </Link>
                            </div>
                            <Link
                              href={`/folder/${file.parents?.[0]}/file/${file.id}/${createSlug(file.name)}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {(!data.duplicates || data.duplicates.length === 0) && (
                  <div className="p-12 text-center border rounded-xl border-dashed">
                    <p className="text-muted-foreground">{t("noFilesFound")}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="oldest" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.oldestFiles?.map((file) => {
                  const Icon = getIcon(file.mimeType);
                  const yearsOld =
                    new Date().getFullYear() -
                    new Date(file.modifiedTime).getFullYear();
                  return (
                    <Link
                      key={file.id}
                      href={`/folder/${file.parents?.[0]}/file/${file.id}/${createSlug(file.name)}`}
                      className="group flex items-start gap-3 p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
                    >
                      <div className="p-2.5 bg-muted rounded-lg text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm mb-1">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatBytes(Number(file.size))}</span>
                          <span>•</span>
                          <span>
                            {new Date(file.modifiedTime).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {yearsOld > 1 && (
                        <span className="text-[10px] font-semibold bg-primary/5 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                          {yearsOld}y ago
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
}

export default function StoragePage() {
  return (
    <Suspense fallback={<Loading />}>
      <StoragePageContent />
    </Suspense>
  );
}
