import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkDatabaseHealth, checkGoogleDriveHealth } from "@/lib/services/health-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "unknown";

  const dbHealth = await checkDatabaseHealth();
  const driveHealth = await checkGoogleDriveHealth();

  const tempHasError = dbHealth.status === "unhealthy" || driveHealth.status === "unhealthy";

  const healthData = {
    status: tempHasError ? "error" : "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: {
      database: dbHealth,
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
}
