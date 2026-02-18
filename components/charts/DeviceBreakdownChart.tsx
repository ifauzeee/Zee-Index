"use client";

import React from "react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface DeviceBreakdownChartProps {
    data: { name: string; count: number }[];
    title: string;
}

const COLORS = [
    "hsl(217, 91%, 60%)",
    "hsl(142, 71%, 45%)",
    "hsl(340, 75%, 55%)",
    "hsl(250, 80%, 60%)",
    "hsl(30, 90%, 55%)",
    "hsl(180, 65%, 45%)",
    "hsl(60, 75%, 50%)",
    "hsl(300, 60%, 55%)",
];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-popover border border-border text-popover-foreground p-3 rounded-lg shadow-xl text-sm">
                <p className="font-semibold mb-1 flex items-center gap-2">
                    <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: data.payload?.fill }}
                    />
                    {data.name}
                </p>
                <p className="text-xs text-muted-foreground">
                    Count:{" "}
                    <span className="text-foreground font-medium">{data.value}</span>
                </p>
            </div>
        );
    }
    return null;
};

const DeviceBreakdownChart: React.FC<DeviceBreakdownChartProps> = ({
    data,
}) => {
    if (!data || data.length === 0) {
        return (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No data available
            </div>
        );
    }

    const chartData = data.map((item, i) => ({
        ...item,
        fill: COLORS[i % COLORS.length],
    }));

    return (
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="name"
                    strokeWidth={0}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    formatter={(value: string) => (
                        <span className="text-xs text-foreground">{value}</span>
                    )}
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px" }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default DeviceBreakdownChart;
