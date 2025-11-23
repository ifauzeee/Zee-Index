"use client";

import { useState, useEffect, createElement } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "@/components/Loading";
import { formatBytes, getIcon } from "@/lib/utils";
import type { DriveFile } from "@/lib/googleDrive";

interface BreakdownItem {
  type: string;
  count: number;
  size: number;
}

interface StorageDetails {
  usage: number;
  limit: number;
  breakdown: BreakdownItem[];
  largestFiles: DriveFile[];
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function StoragePage() {
  const [data, setData] = useState<StorageDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<BreakdownItem | null>(
    null,
  );

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

  const totalBreakdownSize = data.breakdown.reduce(
    (acc, item) => acc + item.size,
    0,
  );

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <motion.div
      className="py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* ... Header Bagian Atas Tetap Sama ... */}

      <div className="mb-8 p-6 bg-card border rounded-lg">
        <div className="flex justify-between items-center mb-2 text-muted-foreground">
          <span className="font-medium text-lg">Total Pemakaian Drive</span>
          <span className="font-mono text-lg">
            {usagePercentage.toFixed(2)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
          {/* PERBAIKAN: Gunakan string persentase yang eksplisit */}
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
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-6">
            Estimasi Rincian (Top 50 File)
          </h2>
          <div className="relative w-72 h-72">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 240 240"
            >
              <circle
                cx="120"
                cy="120"
                r={radius}
                fill="transparent"
                stroke="hsl(var(--muted))"
                strokeWidth="25"
              />
              {/* Data breakdown sekarang akan terisi dari API */}
              {data.breakdown.map((item, index) => {
                const percentage =
                  totalBreakdownSize > 0
                    ? (item.size / totalBreakdownSize) * 100
                    : 0;

                const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -accumulatedOffset;
                accumulatedOffset += (percentage / 100) * circumference;

                return (
                  <motion.circle
                    key={item.type}
                    cx="120"
                    cy="120"
                    r={radius}
                    fill="transparent"
                    stroke={chartColors[index % chartColors.length]}
                    strokeWidth="25"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    initial={{ strokeDasharray: `0 ${circumference}` }}
                    animate={{ strokeDasharray: strokeDasharray }}
                    transition={{
                      duration: 1.2, // Sedikit diperlambat agar lebih smooth
                      ease: "easeOut",
                      delay: index * 0.1,
                    }}
                    onMouseEnter={() => setHoveredSegment(item)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                );
              })}
            </svg>
            <AnimatePresence>
              {hoveredSegment && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                >
                  <p className="text-2xl font-bold">{hoveredSegment.type}</p>
                  <p className="text-muted-foreground font-mono">
                    {formatBytes(hoveredSegment.size)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    (
                    {totalBreakdownSize > 0
                      ? (
                          (hoveredSegment.size / totalBreakdownSize) *
                          100
                        ).toFixed(1)
                      : 0}
                    %)
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3">
            {data.breakdown.map((item, index) => (
              <li key={item.type} className="flex items-center text-sm">
                <span
                  className="h-3 w-3 rounded-full mr-2"
                  style={{
                    backgroundColor: chartColors[index % chartColors.length],
                  }}
                ></span>
                <span className="font-medium">{item.type}</span>
              </li>
            ))}
          </ul>
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
