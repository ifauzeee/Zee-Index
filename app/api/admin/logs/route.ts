import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";

import type { ActivityLog } from "@/lib/activityLogger";

const ACTIVITY_LOG_KEY = "zee-index:activity-log";
const LOGS_PER_PAGE = 50;

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const logStrings: string[] = await kv.zrange(
      ACTIVITY_LOG_KEY,
      offset,
      offset + LOGS_PER_PAGE - 1,
      { rev: true },
    );

    const logs: ActivityLog[] = logStrings
      .map((logStr) => {
        try {
          return JSON.parse(logStr);
        } catch (e) {
          console.error("Gagal mem-parsing entri log:", logStr, e);
          return null;
        }
      })
      .filter((log): log is ActivityLog => log !== null);

    return NextResponse.json({
      logs,
      hasMore: logs.length === LOGS_PER_PAGE,
    });
  } catch (error) {
    console.error("Gagal mengambil log aktivitas:", error);
    return NextResponse.json(
      { error: "Gagal mengambil log aktivitas." },
      { status: 500 },
    );
  }
});
