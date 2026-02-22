"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { useTranslations } from "next-intl";

const LivePerformanceChart = () => {
  const t = useTranslations("AdminPage");
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const initialData = Array.from({ length: 20 }).map((_, i) => ({
      time: i,
      download: Math.floor(Math.random() * 50) + 10,
      upload: Math.floor(Math.random() * 30) + 5,
    }));
    setData(initialData);

    const interval = setInterval(() => {
      setData((prev) => {
        const lastTime = prev[prev.length - 1].time;
        const newData = [
          ...prev.slice(1),
          {
            time: lastTime + 1,
            download: Math.floor(Math.random() * 60) + 5,
            upload: Math.floor(Math.random() * 40) + 2,
          },
        ];
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>{t("downloadSpeed")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>{t("uploadSpeed")}</span>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider animate-pulse">
          {t("liveMonitoring")}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorDownload" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border) / 0.5)"
          />
          <XAxis dataKey="time" hide />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            unit="MB"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              borderColor: "hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: "12px",
            }}
            labelStyle={{ display: "none" }}
          />
          <Area
            type="monotone"
            dataKey="download"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorDownload)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="upload"
            stroke="#6366f1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorUpload)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LivePerformanceChart;
