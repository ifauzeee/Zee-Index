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

interface PageViewsChartProps {
    data: { hour: string; views: number; visitors: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover border border-border text-popover-foreground p-3 rounded-lg shadow-xl text-sm">
                <p className="font-semibold mb-1">{label}</p>
                <div className="space-y-1 text-xs">
                    <p className="flex items-center gap-2">
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
                        />
                        Views:{" "}
                        <span className="font-medium text-foreground">
                            {payload[0]?.value || 0}
                        </span>
                    </p>
                    <p className="flex items-center gap-2">
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: "hsl(142, 71%, 45%)" }}
                        />
                        Visitors:{" "}
                        <span className="font-medium text-foreground">
                            {payload[1]?.value || 0}
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
                        <stop
                            offset="5%"
                            stopColor="hsl(217, 91%, 60%)"
                            stopOpacity={0.3}
                        />
                        <stop
                            offset="95%"
                            stopColor="hsl(217, 91%, 60%)"
                            stopOpacity={0}
                        />
                    </linearGradient>
                    <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop
                            offset="5%"
                            stopColor="hsl(142, 71%, 45%)"
                            stopOpacity={0.3}
                        />
                        <stop
                            offset="95%"
                            stopColor="hsl(142, 71%, 45%)"
                            stopOpacity={0}
                        />
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
                    stroke="hsl(217, 91%, 60%)"
                    fill="url(#viewsGradient)"
                    strokeWidth={2}
                />
                <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="hsl(142, 71%, 45%)"
                    fill="url(#visitorsGradient)"
                    strokeWidth={2}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default PageViewsChart;
