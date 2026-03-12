"use client";

import { useState, useEffect } from "react";
import { formatBytes } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle, Search, PieChart as PieChartIcon } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export default function StorageIntelligence({ stats }: { stats: any }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (stats?.fileTypeDistribution) {
      setData(
        stats.fileTypeDistribution.map((f: any) => ({
          name: f.type,
          value: f.count,
        })),
      );
    }
  }, [stats]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
          <Search className="text-primary" size={20} /> Duplicate Analysis
          (Mock)
        </h3>
        <div className="bg-muted/30 border border-amber-500/30 rounded-lg p-4">
          <div className="flex justify-between items-center text-amber-600 font-medium">
            <span>Identical Files Detected</span>
            <AlertTriangle size={18} />
          </div>
          <p className="text-2xl font-bold mt-2">14</p>
          <p className="text-xs text-muted-foreground">
            Wasting approximately {formatBytes(1024 * 1024 * 543)} of storage
            space
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
          <PieChartIcon className="text-green-500" size={20} /> Content
          Distribution
        </h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value} files`, "Count"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
