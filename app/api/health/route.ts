import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  checkCacheHealth,
  checkDatabaseHealth,
  checkGoogleDriveHealth,
} from "@/lib/services/health-service";
import { createPublicRoute } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async () => {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "unknown";

    const [dbHealth, cacheHealth, driveHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkCacheHealth(),
      checkGoogleDriveHealth(),
    ]);

    const tempHasError =
      dbHealth.status === "unhealthy" ||
      cacheHealth.status === "unhealthy" ||
      driveHealth.status === "unhealthy";

    const healthData = {
      status: tempHasError ? "error" : "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      services: {
        database: dbHealth,
        cache: cacheHealth,
        google_drive: driveHealth,
      },
      meta: {
        userAgent,
      },
    };

    return NextResponse.json(healthData, {
      status: tempHasError ? 503 : 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  },
  { rateLimit: false },
);
