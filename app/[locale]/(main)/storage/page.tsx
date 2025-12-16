"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Loading from "@/components/Loading";
import { formatBytes, getIcon } from "@/lib/utils";
import type { DriveFile } from "@/lib/googleDrive";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import {
  HardDrive,
  FileText,
  AlertCircle,
  PieChart as PieChartIcon,
} from "lucide-react";

interface BreakdownItem {
  type: string;
  count: number;
  size: number;
  [key: string]: string | number;
}

interface StorageDetails {
  usage: number;
  limit: number;
  breakdown: BreakdownItem[];
  largestFiles: DriveFile[];
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
            Ukuran:{" "}
            <span className="text-foreground font-medium">
              {formatBytes(data.size)}
            </span>
          </p>
          <p>
            Jumlah:{" "}
            <span className="text-foreground font-medium">
              {data.count} file
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

function StoragePageContent() {
  const [data, setData] = useState<StorageDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const shareToken = searchParams.get("share_token");

  const createSlug = (name: string) =>
    encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/storage-details");
        if (!response.ok) {
          throw new Error(
            "Gagal memuat data penyimpanan. Silakan coba lagi nanti.",
          );
        }
        const result = await response.json();
        setData(result);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan tidak dikenal.",
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) return <Loading />;
  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">
          Terjadi Kesalahan
        </h3>
        <p className="text-muted-foreground mt-2">{error}</p>
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
      className="container mx-auto py-8 px-4 max-w-7xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <HardDrive className="text-primary w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Analisis Penyimpanan
          </h1>
          <p className="text-muted-foreground">
            Detail penggunaan ruang penyimpanan Google Drive Anda.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-muted-foreground" />
          Ringkasan Penggunaan
        </h2>

        <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-4xl font-bold text-foreground">
                  {usagePercentage.toFixed(1)}%
                </span>
                <span className="text-muted-foreground ml-2">Terpakai</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  Total Kapasitas
                </div>
                <div className="font-medium text-foreground">
                  {formatBytes(data.limit)}
                </div>
              </div>
            </div>

            <div className="relative w-full bg-muted rounded-full h-4 overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${usagePercentage}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>

            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  {formatBytes(data.usage)} Terpakai
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <span className="text-muted-foreground">
                  {formatBytes(freeSpace)} Tersedia
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-6">Distribusi Tipe File</h2>
            <div className="h-[300px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
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
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">
                    {data.breakdown.reduce((acc, item) => acc + item.count, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Files</p>
                </div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              {chartData.map((item) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="truncate font-medium">{item.type}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs ml-2">
                    {formatBytes(item.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                10 File Terbesar
              </h2>
            </div>

            <div className="space-y-1">
              {data.largestFiles.length > 0 ? (
                data.largestFiles.map((file) => {
                  const Icon = getIcon(file.mimeType);
                  return (
                    <div key={file.id} className="group">
                      {shareToken ? (
                        <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all opacity-70 cursor-not-allowed">
                          <div className="p-2 bg-background rounded-lg border shadow-sm text-muted-foreground">
                            <Icon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-foreground">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Modified:{" "}
                              {new Date(
                                file.modifiedTime ?? "",
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {formatBytes(Number(file.size))}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={`/folder/${file.parents?.[0]}/file/${file.id}/${createSlug(file.name)}`}
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all"
                        >
                          <div className="p-2 bg-background rounded-lg border shadow-sm group-hover:border-primary/50 group-hover:text-primary transition-colors text-muted-foreground">
                            <Icon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-foreground group-hover:text-primary transition-colors">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(
                                file.modifiedTime ?? "",
                              ).toLocaleDateString("id-ID", {
                                dateStyle: "medium",
                              })}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {formatBytes(Number(file.size))}
                            </span>
                          </div>
                        </Link>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Tidak ada file yang ditemukan.
                </div>
              )}
            </div>
          </div>
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
