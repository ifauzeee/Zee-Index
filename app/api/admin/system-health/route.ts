import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import {
  getHealthServicesSnapshot,
  summarizeLatencies,
} from "@/lib/services/health-service";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const startedAt = performance.now();
    const services = await getHealthServicesSnapshot({
      includeDriveQuota: true,
    });

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const errorsLast24h = await db.activityLog.count({
      where: {
        severity: "error",
        timestamp: { gte: now - oneDay },
      },
    });

    const errorsPrev24h = await db.activityLog.count({
      where: {
        severity: "error",
        timestamp: { gte: now - 2 * oneDay, lt: now - oneDay },
      },
    });

    const latency = summarizeLatencies(services, performance.now() - startedAt);
    const hasDependencyError = Object.values(services).some(
      (service) => service.status === "unhealthy",
    );

    return NextResponse.json({
      status: hasDependencyError ? "error" : "ok",
      services,
      errorRate: {
        last24h: errorsLast24h,
        previous24h: errorsPrev24h,
        trendPercentage:
          errorsPrev24h > 0
            ? ((errorsLast24h - errorsPrev24h) / errorsPrev24h) * 100
            : 0,
      },
      latency,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
