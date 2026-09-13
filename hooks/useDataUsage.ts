"use client";

import { useQuery } from "@tanstack/react-query";
import { formatBytes } from "@/lib/utils";

export function useDataUsageQuery(refreshKey = 0) {
  return useQuery<string>({
    queryKey: ["dataUsage", refreshKey],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch("/api/datausage", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error("Failed to fetch usage data.");
        const data = await response.json();
        return formatBytes(data.totalUsage);
      } finally {
        clearTimeout(timeoutId);
      }
    },
    staleTime: 60_000,
  });
}
