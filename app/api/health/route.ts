import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { getAccessToken } from "@/lib/drive";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const headersList = headers();
  const userAgent = headersList.get("user-agent") || "unknown";

  const healthData = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: {
      database: { status: "unknown", latency: 0 },
      google_drive: { status: "unknown", latency: 0 },
    },
    meta: {
      userAgent,
    },
  };

  let hasError = false;

  const kvStart = performance.now();
  try {
    const testKey = `health:${Date.now()}`;
    await kv.set(testKey, "ok", { ex: 5 });
    const val = await kv.get(testKey);
    const kvEnd = performance.now();

    if (val === "ok") {
      healthData.services.database = {
        status: "healthy",
        latency: Math.round(kvEnd - kvStart),
      };
    } else {
      throw new Error("Write/Read mismatch");
    }
  } catch (error: any) {
    hasError = true;
    healthData.services.database = {
      status: "unhealthy",
      latency: Math.round(performance.now() - kvStart),
    };
    (healthData.services.database as any).error = error.message;
  }

  const driveStart = performance.now();
  try {
    const token = await getAccessToken();
    const rootId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;

    if (!rootId) throw new Error("Root Folder ID not configured");

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${rootId}?fields=id`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        next: { revalidate: 0 },
      },
    );

    const driveEnd = performance.now();

    if (response.ok) {
      healthData.services.google_drive = {
        status: "healthy",
        latency: Math.round(driveEnd - driveStart),
      };
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API Error ${response.status}`);
    }
  } catch (error: any) {
    if (error.message.includes("Aplikasi belum dikonfigurasi")) {
      healthData.services.google_drive = {
        status: "not_configured",
        latency: 0,
      };
    } else {
      hasError = true;
      healthData.services.google_drive = {
        status: "unhealthy",
        latency: Math.round(performance.now() - driveStart),
      };
      (healthData.services.google_drive as any).error = error.message;
    }
  }

  if (hasError) {
    healthData.status = "error";
  }

  return NextResponse.json(healthData, {
    status: hasError ? 503 : 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
