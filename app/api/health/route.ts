import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  checkCacheHealth,
  checkDatabaseHealth,
  checkGoogleDriveHealth,
} from "@/lib/services/health-service";
import { createPublicRoute } from "@/lib/api-middleware";
import { memoryCache } from "@/lib/memory-cache";

// The Drive check calls the Google API; an unauthenticated endpoint must not
// turn every request into one (Z2-18). DB and cache checks stay live.
const DRIVE_HEALTH_CACHE_KEY = "health:google-drive";
const DRIVE_HEALTH_CACHE_TTL_MS = 60_000;

async function cachedDriveHealth() {
  const cached = memoryCache.get<
    Awaited<ReturnType<typeof checkGoogleDriveHealth>>
  >(DRIVE_HEALTH_CACHE_KEY);
  if (cached) return cached;
  const result = await checkGoogleDriveHealth();
  memoryCache.set(DRIVE_HEALTH_CACHE_KEY, result, DRIVE_HEALTH_CACHE_TTL_MS);
  return result;
}

export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async () => {
    const headersList = await headers();

    const [dbHealth, cacheHealth, driveHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkCacheHealth(),
      cachedDriveHealth(),
    ]);

    const tempHasError =
      dbHealth.status === "unhealthy" || cacheHealth.status === "unhealthy";

    const healthData = {
      status: tempHasError ? "error" : "ok",
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth.status,
        cache: cacheHealth.status,
        google_drive: driveHealth.status,
      },
    };

    return NextResponse.json(healthData, {
      status: tempHasError ? 503 : 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Vary: headersList.get("origin") ? "Origin" : "Accept",
      },
    });
  },
  { rateLimit: "API" },
);
