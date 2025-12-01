"use client";
import { useState, useEffect, createElement, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Loading from "@/components/Loading";
import { formatBytes, getIcon } from "@/lib/utils";
import type { DriveFile } from "@/lib/googleDrive";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";

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

interface TooltipPayload {
  payload: BreakdownItem;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

interface CustomContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  name: string;
  value: number;
}

const chartColors = [
  "#e11d48",
  "#0891b2",
  "#0284c7",
  "#ca8a04",
  "#ea580c",
  "#7c3aed",
];

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border text-popover-foreground p-2 rounded-lg shadow-lg text-sm">
        <p className="font-semibold">{data.type}</p>
        <p>Ukuran: {formatBytes(data.size)}</p>
        <p>Jumlah: {data.count} file</p>
      </div>
    );
  }
  return null;
};

const CustomContent = (props: CustomContentProps) => {
  const { x, y, width, height, index, name, value } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: chartColors[index % chartColors.length],
          stroke: "hsl(var(--background))",
          strokeWidth: 2,
          strokeOpacity: 1,
        }}
      />
      {width > 30 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight="bold"
          style={{ pointerEvents: "none" }}
        >
          {name}
        </text>
      )}
      {width > 50 && height > 50 && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 14}
          textAnchor="middle"
          fill="#fff"
          fontSize={10}
          style={{ pointerEvents: "none" }}
        >
          {formatBytes(value)}
        </text>
      )}
    </g>
  );
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
    return <div className="text-center py-20 text-red-500">{error}</div>;
  if (!data) return null;
  const usagePercentage = data.limit > 0 ? (data.usage / data.limit) * 100 : 0;

  return (
    <motion.div
      className="py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-2xl font-bold mb-6">Analisis Penyimpanan</h1>

      <div className="mb-8 p-6 bg-card border rounded-lg">
        <div className="flex justify-between items-center mb-2 text-muted-foreground">
          <span className="font-medium text-lg">Total Pemakaian Drive</span>
          <span className="font-mono text-lg">
            {usagePercentage.toFixed(2)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
          <motion.div
            className="bg-primary h-4 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${usagePercentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
        <div className="text-right mt-2 font-mono text-sm text-muted-foreground">
          {formatBytes(data.usage)} dari {formatBytes(data.limit)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold mb-6">Visualisasi Tipe File</h2>
          <div className="bg-card border rounded-xl p-4 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={data.breakdown}
                dataKey="size"
                nameKey="type"
                content={<CustomContent {...({} as any)} />}
                aspectRatio={4 / 3}
              >
                <Tooltip content={<CustomTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {data.breakdown.map((item, index) => (
              <div
                key={item.type}
                className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{
                    backgroundColor: chartColors[index % chartColors.length],
                  }}
                />
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{item.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.count} files
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">10 File Terbesar</h2>
          <ul className="space-y-2">
            {data.largestFiles.map((file) => {
              const Icon = getIcon(file.mimeType);
              return (
                <li key={file.id} className="border-b border-border/50 pb-2">
                  {shareToken ? (
                    <div
                      className="flex items-center gap-3 p-2 -mx-2 opacity-50 cursor-not-allowed"
                      title="Navigasi dibatasi dalam mode berbagi"
                    >
                      {createElement(Icon, {
                        size: 20,
                        className: "text-muted-foreground shrink-0",
                      })}
                      <div className="flex-1 truncate">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatBytes(Number(file.size))}
                      </span>
                    </div>
                  ) : (
                    <Link
                      href={`/folder/${file.parents?.[0]}/file/${file.id}/${createSlug(file.name)}`}
                      legacyBehavior
                    >
                      <a className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-accent transition-colors">
                        {createElement(Icon, {
                          size: 20,
                          className: "text-muted-foreground shrink-0",
                        })}
                        <div className="flex-1 truncate">
                          <p className="text-sm font-medium truncate">
                            {file.name}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatBytes(Number(file.size))}
                        </span>
                      </a>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
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