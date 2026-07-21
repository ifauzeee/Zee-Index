import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAnalyticsData } = vi.hoisted(() => ({
  mockGetAnalyticsData: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("@/lib/analyticsTracker", () => ({
  getAnalyticsData: mockGetAnalyticsData,
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
}));

import { GET } from "@/app/api/admin/analytics/route";

describe("app/api/admin/analytics GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnalyticsData.mockResolvedValue({
      totalViews: 100,
      uniqueVisitors: 50,
      topPaths: [],
    });
  });

  it("returns analytics data", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/analytics"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ totalViews: 100, uniqueVisitors: 50, topPaths: [] });
  });

  it("returns 500 on error", async () => {
    mockGetAnalyticsData.mockRejectedValue(new Error("db error"));
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/analytics"),
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});
