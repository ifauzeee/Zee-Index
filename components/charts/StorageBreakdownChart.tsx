"use client";
import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { Loader2, AlertCircle, HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/utils";
interface StorageItem {
  type: string;
  count: number;
  size: number;
  [key: string]: any;
}
interface StorageDetails {
  usage: number;
  limit: number;
  breakdown: StorageItem[];
}
const TYPE_COLORS: Record<string, string> = {
  Video: "#facc15",
  Gambar: "#3b82f6",
  Audio: "#a855f7",
  PDF: "#ef4444",
  Dokumen: "#22c55e",
  Arsip: "#f97316",
  Lainnya: "#6b7280",
};
export default function StorageBreakdownChart() {
  const [data, setData] = useState<StorageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/storage-details")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch storage details");
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-red-500 gap-2">
        <AlertCircle size={24} />
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  if (!data || !data.breakdown.length) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }
  const totalSize = data.breakdown.reduce((acc, item) => acc + item.size, 0);
  const usagePercent =
    data.limit > 0 ? ((data.usage / data.limit) * 100).toFixed(1) : 0;
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percent =
        totalSize > 0 ? ((item.size / totalSize) * 100).toFixed(1) : 0;
      return (
        <div className="bg-popover border text-popover-foreground px-3 py-2 rounded-lg shadow-lg text-sm">
          <p className="font-semibold mb-1">{item.type}</p>
          <p>Size: {formatBytes(item.size)}</p>
          <p>Files: {item.count}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {percent}% of total
          </p>
        </div>
      );
    }
    return null;
  };
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-primary" />
            <span className="font-medium">Storage Used</span>
          </div>
          <span className="text-muted-foreground">
            {formatBytes(data.usage)} / {formatBytes(data.limit)}
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(Number(usagePercent), 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">
          {usagePercent}% used
        </p>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.breakdown}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <XAxis
              type="number"
              tickFormatter={(value) => formatBytes(value)}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="type"
              tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted)/0.3)" }}
            />
            <Bar dataKey="size" radius={[0, 6, 6, 0]} barSize={20}>
              {data.breakdown.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={TYPE_COLORS[entry.type] || TYPE_COLORS["Lainnya"]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 justify-center pt-2">
        {data.breakdown.map((item) => (
          <div key={item.type} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor:
                  TYPE_COLORS[item.type] || TYPE_COLORS["Lainnya"],
              }}
            />
            <span className="text-muted-foreground">{item.type}</span>
            <span className="font-medium">({item.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
