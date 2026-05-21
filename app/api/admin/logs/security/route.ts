import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { getSecurityLogs } from "@/lib/activityLogger";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const logs = await getSecurityLogs(20);
    return NextResponse.json(logs);
  } catch (error) {
    logger.error({ err: error }, "[Security Audit API] Error");
    return NextResponse.json(
      { error: "Failed to fetch security logs" },
      { status: 500 },
    );
  }
});
