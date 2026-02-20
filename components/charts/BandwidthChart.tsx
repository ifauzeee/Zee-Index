"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface BandwidthChartProps {
  data: { date: string; bytes: number }[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border text-popover-foreground p-3 rounded-lg shadow-xl text-sm">
        <p className="font-semibold mb-1">{label}</p>
        <p className="text-xs text-muted-foreground">
          Bandwidth:{" "}
          <span className="text-foreground font-medium">
            {formatBytes(payload[0]?.value || 0)}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

const BandwidthChart: React.FC<BandwidthChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatBytes(v)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="bytes"
          fill="hsl(217, 91%, 60%)"
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BandwidthChart;
