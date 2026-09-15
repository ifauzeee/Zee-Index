import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { getActivityLogs, getActivityStats } from "@/lib/activityLogger";
import { kv } from "@/lib/kv";
import { db } from "@/lib/db";
import { EVENT_PIPELINE_KEYS } from "@/lib/events/pipeline";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const [logs, stats] = await Promise.all([
      getActivityLogs(100),
      getActivityStats(),
    ]);
    return NextResponse.json({ logs, stats });
  } catch (error) {
    logger.error({ err: error }, "[Audit API] Error");
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 },
    );
  }
});

export const DELETE = createAdminRoute(async () => {
  try {
    await Promise.all([
      db.activityLog.deleteMany(),
      kv.del(EVENT_PIPELINE_KEYS.activityLog, EVENT_PIPELINE_KEYS.eventStream),
      kv.del("recent_events"),
    ]);
    return NextResponse.json({ message: "Logs cleared" });
  } catch {
    return NextResponse.json(
      { error: "Failed to clear logs" },
      { status: 500 },
    );
  }
});
