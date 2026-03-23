import { db } from "@/lib/db";
import { kv } from "@/lib/kv";
import { getAccessToken } from "@/lib/drive";
import { GOOGLE_DRIVE_API_BASE_URL } from "@/lib/constants";
import { getRootFolderId } from "@/lib/config";
import { getErrorMessage } from "@/lib/errors";

export type HealthStatus = "healthy" | "unhealthy" | "not_configured";

export interface HealthCheckResult {
  status: HealthStatus;
  latency: number;
  checkedAt: string;
  error?: string;
}

export interface CacheHealthCheckResult extends HealthCheckResult {
  backend: "redis" | "memory";
}

export interface GoogleDriveQuota {
  usage: number;
  limit: number;
}

export interface GoogleDriveHealthCheckResult extends HealthCheckResult {
  quota?: GoogleDriveQuota | null;
}

export interface HealthServicesSnapshot {
  database: HealthCheckResult;
  cache: CacheHealthCheckResult;
  google_drive: GoogleDriveHealthCheckResult;
}

export interface LatencySummary {
  totalCheckMs: number;
  averageDependencyMs: number;
  fastestDependency: { name: keyof HealthServicesSnapshot; latency: number };
  slowestDependency: { name: keyof HealthServicesSnapshot; latency: number };
  dependencies: Record<keyof HealthServicesSnapshot, number>;
}

function createCheckedAt(): string {
  return new Date().toISOString();
}

export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const startedAt = performance.now();

  try {
    await db.$queryRaw`SELECT 1`;

    return {
      status: "healthy",
      latency: Math.round(performance.now() - startedAt),
      checkedAt: createCheckedAt(),
    };
  } catch (error: unknown) {
    return {
      status: "unhealthy",
      latency: Math.round(performance.now() - startedAt),
      checkedAt: createCheckedAt(),
      error: getErrorMessage(error),
    };
  }
}

export async function checkCacheHealth(): Promise<CacheHealthCheckResult> {
  const startedAt = performance.now();
  const backend = process.env.REDIS_URL ? "redis" : "memory";

  try {
    const testKey = `health:${Date.now()}`;
    await kv.set(testKey, "ok", { ex: 5 });
    const value = await kv.get(testKey);
    await kv.del(testKey);

    if (value !== "ok") {
      throw new Error("Cache write/read mismatch");
    }

    return {
      status: "healthy",
      latency: Math.round(performance.now() - startedAt),
      checkedAt: createCheckedAt(),
      backend,
    };
  } catch (error: unknown) {
    return {
      status: "unhealthy",
      latency: Math.round(performance.now() - startedAt),
      checkedAt: createCheckedAt(),
      backend,
      error: getErrorMessage(error),
    };
  }
}

export async function checkGoogleDriveHealth(options?: {
  includeQuota?: boolean;
}): Promise<GoogleDriveHealthCheckResult> {
  const startedAt = performance.now();

  try {
    const token = await getAccessToken();
    const rootId = await getRootFolderId();

    if (!rootId) {
      throw new Error("Root Folder ID not configured");
    }

    const rootResponse = await fetch(
      `${GOOGLE_DRIVE_API_BASE_URL}/files/${rootId}?fields=id`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        next: { revalidate: 0 },
      },
    );

    if (!rootResponse.ok) {
      const errorData = await rootResponse.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API Error ${rootResponse.status}`,
      );
    }

    let quota: GoogleDriveQuota | null | undefined;

    if (options?.includeQuota) {
      const quotaResponse = await fetch(
        `${GOOGLE_DRIVE_API_BASE_URL}/about?fields=storageQuota`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          next: { revalidate: 0 },
        },
      );

      if (quotaResponse.ok) {
        const data = (await quotaResponse.json()) as {
          storageQuota?: {
            usage?: string;
            limit?: string;
          };
        };

        quota = {
          usage: Number.parseInt(data.storageQuota?.usage || "0", 10),
          limit: Number.parseInt(data.storageQuota?.limit || "0", 10),
        };
      }
    }

    return {
      status: "healthy",
      latency: Math.round(performance.now() - startedAt),
      checkedAt: createCheckedAt(),
      quota,
    };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    const status =
      errorMessage.includes("Aplikasi belum dikonfigurasi") ||
      errorMessage.includes("Root Folder ID")
        ? "not_configured"
        : "unhealthy";

    return {
      status,
      latency: Math.round(performance.now() - startedAt),
      checkedAt: createCheckedAt(),
      error: errorMessage,
      quota: null,
    };
  }
}

export async function getHealthServicesSnapshot(options?: {
  includeDriveQuota?: boolean;
}): Promise<HealthServicesSnapshot> {
  const [database, cache, google_drive] = await Promise.all([
    checkDatabaseHealth(),
    checkCacheHealth(),
    checkGoogleDriveHealth({ includeQuota: options?.includeDriveQuota }),
  ]);

  return {
    database,
    cache,
    google_drive,
  };
}

export function summarizeLatencies(
  services: HealthServicesSnapshot,
  totalCheckMs: number,
): LatencySummary {
  const entries = Object.entries(services) as Array<
    [keyof HealthServicesSnapshot, HealthCheckResult]
  >;
  const sorted = [...entries].sort((a, b) => a[1].latency - b[1].latency);
  const dependencyLatencies = Object.fromEntries(
    entries.map(([name, service]) => [name, service.latency]),
  ) as Record<keyof HealthServicesSnapshot, number>;
  const averageDependencyMs =
    entries.reduce((sum, [, service]) => sum + service.latency, 0) /
    Math.max(entries.length, 1);

  const [fastestName, fastestService] = sorted[0];
  const [slowestName, slowestService] = sorted[sorted.length - 1];

  return {
    totalCheckMs: Math.round(totalCheckMs),
    averageDependencyMs: Math.round(averageDependencyMs),
    fastestDependency: {
      name: fastestName,
      latency: fastestService.latency,
    },
    slowestDependency: {
      name: slowestName,
      latency: slowestService.latency,
    },
    dependencies: dependencyLatencies,
  };
}
