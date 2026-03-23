import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetHealthServicesSnapshot, mockActivityLogCount } = vi.hoisted(
  () => ({
    mockGetHealthServicesSnapshot: vi.fn(),
    mockActivityLogCount: vi.fn(),
  }),
);

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("@/lib/services/health-service", () => ({
  getHealthServicesSnapshot: mockGetHealthServicesSnapshot,
  summarizeLatencies: vi.fn(() => ({
    totalCheckMs: 42,
    averageDependencyMs: 14,
    fastestDependency: { name: "cache", latency: 5 },
    slowestDependency: { name: "google_drive", latency: 25 },
    dependencies: {
      database: 12,
      cache: 5,
      google_drive: 25,
    },
  })),
}));

vi.mock("@/lib/db", () => ({
  db: {
    activityLog: {
      count: mockActivityLogCount,
    },
  },
}));

import { GET } from "@/app/api/admin/system-health/route";

describe("app/api/admin/system-health GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHealthServicesSnapshot.mockResolvedValue({
      database: {
        status: "healthy",
        latency: 12,
        checkedAt: "2026-03-23T00:00:00.000Z",
      },
      cache: {
        status: "healthy",
        latency: 5,
        checkedAt: "2026-03-23T00:00:00.000Z",
        backend: "memory",
      },
      google_drive: {
        status: "healthy",
        latency: 25,
        checkedAt: "2026-03-23T00:00:00.000Z",
        quota: { usage: 100, limit: 1000 },
      },
    });
    mockActivityLogCount.mockResolvedValueOnce(3).mockResolvedValueOnce(6);
  });

  it("returns measured service health and error rates", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/system-health"),
    );

    expect(response.status).toBe(200);

    const payload = await response.json();

    expect(payload.status).toBe("ok");
    expect(payload.services.cache.backend).toBe("memory");
    expect(payload.errorRate).toEqual({
      last24h: 3,
      previous24h: 6,
      trendPercentage: -50,
    });
    expect(payload.latency.totalCheckMs).toBe(42);
  });
});
