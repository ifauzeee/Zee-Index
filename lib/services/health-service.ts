import { kv } from "@/lib/kv";
import { getAccessToken } from "@/lib/drive";
import { getRootFolderId } from "@/lib/config";
import { getErrorMessage } from "@/lib/errors";

type HealthStatus = "healthy" | "unhealthy" | "not_configured";

interface HealthCheckResult {
  status: HealthStatus;
  latency: number;
  error?: string;
}

export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const kvStart = performance.now();
  try {
    const testKey = `health:${Date.now()}`;
    await kv.set(testKey, "ok", { ex: 5 });
    const val = await kv.get(testKey);
    const kvEnd = performance.now();

    if (val === "ok") {
      return {
        status: "healthy",
        latency: Math.round(kvEnd - kvStart),
      };
    } else {
      throw new Error("Write/Read mismatch");
    }
  } catch (error: unknown) {
    return {
      status: "unhealthy",
      latency: Math.round(performance.now() - kvStart),
      error: getErrorMessage(error),
    };
  }
}

export async function checkGoogleDriveHealth(): Promise<HealthCheckResult> {
  const driveStart = performance.now();
  try {
    const token = await getAccessToken();
    const rootId = await getRootFolderId();

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
      return {
        status: "healthy",
        latency: Math.round(driveEnd - driveStart),
      };
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API Error ${response.status}`);
    }
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (
      errorMessage.includes("Aplikasi belum dikonfigurasi") ||
      errorMessage.includes("Root Folder ID")
    ) {
      return {
        status: "not_configured",
        latency: Math.round(performance.now() - driveStart),
        error: errorMessage,
      };
    } else {
      return {
        status: "unhealthy",
        latency: Math.round(performance.now() - driveStart),
        error: errorMessage,
      };
    }
  }
}
