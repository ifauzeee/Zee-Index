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

interface VisitorsTrendChartProps {
    data: { date: string; views: number; visitors: number }[];
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
                            style={{ backgroundColor: "hsl(250, 80%, 60%)" }}
                        />
                        Views:{" "}
                        <span className="font-medium text-foreground">
                            {payload[0]?.value || 0}
                        </span>
                    </p>
                    <p className="flex items-center gap-2">
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: "hsl(340, 75%, 55%)" }}
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

const VisitorsTrendChart: React.FC<VisitorsTrendChartProps> = ({ data }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
                <defs>
                    <linearGradient
                        id="trendViewsGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="5%"
                            stopColor="hsl(250, 80%, 60%)"
                            stopOpacity={0.3}
                        />
                        <stop
                            offset="95%"
                            stopColor="hsl(250, 80%, 60%)"
                            stopOpacity={0}
                        />
                    </linearGradient>
                    <linearGradient
                        id="trendVisitorsGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="5%"
                            stopColor="hsl(340, 75%, 55%)"
                            stopOpacity={0.3}
                        />
                        <stop
                            offset="95%"
                            stopColor="hsl(340, 75%, 55%)"
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
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
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
                    stroke="hsl(250, 80%, 60%)"
                    fill="url(#trendViewsGradient)"
                    strokeWidth={2}
                />
                <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="hsl(340, 75%, 55%)"
                    fill="url(#trendVisitorsGradient)"
                    strokeWidth={2}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default VisitorsTrendChart;
