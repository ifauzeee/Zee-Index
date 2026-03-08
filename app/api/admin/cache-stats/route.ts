import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getKvCacheStats } from "@/lib/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
}
