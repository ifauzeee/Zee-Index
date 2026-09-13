"use client";

import React from "react";
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

interface PageViewsChartProps {
  data: { hour: string; views: number; visitors: number }[];
}

interface PageViewsTooltipPayload {
  value?: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: PageViewsTooltipPayload[];
  label?: string;
}) => {
  const t = useTranslations("Charts");

  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border text-popover-foreground p-3 rounded-lg shadow-xl text-sm">
        <p className="font-semibold mb-1">{label}</p>
        <div className="space-y-1 text-xs">
          <p className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--chart-1)" }}
            />
            {t("views")}:{" "}
            <span className="font-medium text-foreground">
              {payload?.[0]?.value || 0}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--chart-2)" }}
            />
            {t("visitors")}:{" "}
            <span className="font-medium text-foreground">
              {payload?.[1]?.value || 0}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const PageViewsChart: React.FC<PageViewsChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="hour"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={3}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="views"
          stroke="var(--chart-1)"
          fill="url(#viewsGradient)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="visitors"
          stroke="var(--chart-2)"
          fill="url(#visitorsGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default PageViewsChart;
