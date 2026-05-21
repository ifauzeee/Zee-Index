import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import { EVENT_PIPELINE_KEYS } from "@/lib/events/pipeline";

import type { ActivityLog } from "@/lib/activityLogger";

const LOGS_PER_PAGE = 50;

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const rawLogs = await kv.zrange<unknown>(
      EVENT_PIPELINE_KEYS.activityLog,
      offset,
      offset + LOGS_PER_PAGE - 1,
      { rev: true },
    );

    const logs: ActivityLog[] = rawLogs
      .map((entry) => {
        try {
          return typeof entry === "string" ? JSON.parse(entry) : entry;
        } catch (e) {
          logger.error({ err: e, entry }, "Gagal mem-parsing entri log");
          return null;
        }
      })
      .filter((log): log is ActivityLog => log !== null);

    return NextResponse.json({
      logs,
      hasMore: logs.length === LOGS_PER_PAGE,
    });
  } catch (error) {
    logger.error({ err: error }, "Gagal mengambil log aktivitas");
    return NextResponse.json(
      { error: "Gagal mengambil log aktivitas." },
      { status: 500 },
    );
  }
});
