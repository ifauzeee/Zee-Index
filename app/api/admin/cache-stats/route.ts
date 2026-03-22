import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { getKvCacheStats } from "@/lib/kv";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  const stats = getKvCacheStats();

  return NextResponse.json({
    cacheStats: stats,
    timestamp: new Date().toISOString(),
    info: {
      hits: `${stats.hits} cache hits`,
      misses: `${stats.misses} cache misses`,
      hitRate: stats.hitRate,
      size: `${stats.size} entries in memory`,
      evictions: `${stats.evictions} entries evicted`,
    },
  });
});
