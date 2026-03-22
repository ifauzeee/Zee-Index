import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { getActivityLogs } from "@/lib/activityLogger";
import { kv } from "@/lib/kv";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const logs = await getActivityLogs(100);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("[Audit API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 },
    );
  }
});

export const DELETE = createAdminRoute(async () => {
  try {
    const ACTIVITY_LOG_KEY = "zee-index:activity-log";
    await kv.del(ACTIVITY_LOG_KEY);
    return NextResponse.json({ message: "Logs cleared" });
  } catch {
    return NextResponse.json(
      { error: "Failed to clear logs" },
      { status: 500 },
    );
  }
});
