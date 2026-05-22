import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockFindMany, mockGetStats, mockQueryRaw } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockGetStats: vi.fn(),
  mockQueryRaw: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => await handler({ request });
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: mockQueryRaw,
    activityLog: {
      findMany: mockFindMany,
    },
  },
}));

vi.mock("@/lib/memory-cache", () => ({
  memoryCache: {
    getStats: mockGetStats,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import {
  ANALYTICS_SECURITY_EVENTS_TAKE_LIMIT,
  GET,
} from "@/app/api/admin/analytics/enhanced/route";

describe("app/api/admin/analytics/enhanced route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryRaw
      .mockResolvedValueOnce([
        { day: "2026-05-22", type: "DOWNLOAD", count: 2 },
        { day: "2026-05-22", type: "UPLOAD", count: 1 },
        { day: "2026-05-22", type: "PREVIEW", count: 3 },
      ])
      .mockResolvedValueOnce([{ hour: 10, count: 6 }])
      .mockResolvedValueOnce([
        {
          activeUsersLast5Min: 2,
          requestsLast5Min: 4,
          requestsLastHour: 8,
        },
      ])
      .mockResolvedValueOnce([
        {
          uniqueUsersToday: 3,
          uniqueUsersThisWeek: 4,
          uniqueUsersThisMonth: 5,
          totalActionsToday: 10,
          errorActionsToday: 1,
        },
      ])
      .mockResolvedValueOnce([
        { type: "DOWNLOAD", count: 2 },
        { type: "UPLOAD", count: 1 },
      ]);
    mockFindMany.mockResolvedValue([]);
    mockGetStats.mockReturnValue({
      hitRate: 0,
      size: 0,
    });
  });

  it("aggregates activity analytics in the database and limits security events", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/analytics/enhanced"),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(mockQueryRaw).toHaveBeenCalledTimes(5);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { timestamp: "desc" },
        take: ANALYTICS_SECURITY_EVENTS_TAKE_LIMIT,
        select: {
          type: true,
          userEmail: true,
          ipAddress: true,
          timestamp: true,
          severity: true,
        },
      }),
    );
    expect(payload.realtime).toEqual({
      activeUsersLast5Min: 2,
      requestsLast5Min: 4,
      requestsLastHour: 8,
    });
    expect(payload.engagement).toEqual({
      uniqueUsersToday: 3,
      uniqueUsersThisWeek: 4,
      uniqueUsersThisMonth: 5,
      totalActionsToday: 10,
    });
    expect(payload.health.errorRate).toBe(10);
    expect(payload.activityBreakdown).toEqual({
      DOWNLOAD: 2,
      UPLOAD: 1,
    });
  });
});
