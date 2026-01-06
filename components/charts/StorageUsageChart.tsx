import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useTranslations } from "next-intl";
import { formatBytes } from "@/lib/utils";

interface BreakdownItem {
  type: string;
  count: number;
  size: number;
  [key: string]: string | number | undefined;
  fill?: string;
}

interface StorageUsageChartProps {
  data: BreakdownItem[];
}

const CustomTooltip = ({ active, payload }: any) => {
  const t = useTranslations("StoragePage");
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border text-popover-foreground p-3 rounded-lg shadow-xl text-sm">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: data.fill }}
          />
          {data.type}
        </p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            {t("size")}{" "}
            <span className="text-foreground font-medium">
              {formatBytes(data.size)}
            </span>
          </p>
          <p>
            {t("count")}{" "}
            <span className="text-foreground font-medium">{data.count}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const StorageUsageChart: React.FC<StorageUsageChartProps> = ({ data }) => {
  const t = useTranslations("StoragePage");

  return (
    <div className="h-[300px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="size"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{t("total")}</p>
          <p className="text-xl font-bold">
            {data.reduce((acc, item) => acc + item.count, 0)}
          </p>
          <p className="text-xs text-muted-foreground">{t("totalFiles")}</p>
        </div>
      </div>
    </div>
  );
};

export default StorageUsageChart;
