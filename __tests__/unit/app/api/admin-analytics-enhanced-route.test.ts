import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockFindMany, mockGetStats } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockGetStats: vi.fn(),
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
  ANALYTICS_ACTIVITY_LOG_TAKE_LIMIT,
  GET,
} from "@/app/api/admin/analytics/enhanced/route";

describe("app/api/admin/analytics/enhanced route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockGetStats.mockReturnValue({
      hitRate: 0,
      size: 0,
    });
  });

  it("limits the 30-day activity log query", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/analytics/enhanced"),
    );

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { timestamp: "desc" },
        take: ANALYTICS_ACTIVITY_LOG_TAKE_LIMIT,
      }),
    );
  });
});
