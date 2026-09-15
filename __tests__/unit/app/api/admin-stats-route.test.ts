import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockQueryRawUnsafe, mockGetAnalyticsData } = vi.hoisted(() => ({
  mockQueryRawUnsafe: vi.fn(),
  mockGetAnalyticsData: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: any[]) => any>(fn: T) => fn,
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
    $queryRawUnsafe: mockQueryRawUnsafe,
  },
}));

vi.mock("@/lib/analyticsTracker", () => ({
  getAnalyticsData: mockGetAnalyticsData,
}));

import { GET } from "@/app/api/admin/stats/route";

describe("app/api/admin/stats route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnalyticsData.mockResolvedValue({
      bandwidth: {
        totalToday: 100,
        totalThisWeek: 700,
        totalThisMonth: 3000,
      },
    });

    mockQueryRawUnsafe.mockImplementation((query: string) => {
      if (query.includes("SPLIT_PART")) {
        return Promise.resolve([{ type: "MP4", count: BigInt(2) }]);
      }
      if (query.includes("EXTRACT(HOUR")) {
        return Promise.resolve([{ hour: 12, count: BigInt(2) }]);
      }
      if (query.includes("EXTRACT(DOW")) {
        return Promise.resolve([{ dow: 1, count: BigInt(2) }]);
      }
      if (query.includes("userEmail")) {
        return Promise.resolve([
          { email: "admin@example.com", count: BigInt(3) },
        ]);
      }
      if (query.includes("UPLOAD")) {
        return Promise.resolve([{ name: "draft.docx", count: BigInt(1) }]);
      }
      if (query.includes("itemName")) {
        return Promise.resolve([{ name: "movie.mp4", count: BigInt(2) }]);
      }
      return Promise.resolve([]);
    });
  });

  it("returns aggregated admin stats from SQL aggregation", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/stats"),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(mockQueryRawUnsafe).toHaveBeenCalledTimes(6);
    expect(payload.bandwidthSummary).toEqual({
      today: 100,
      thisWeek: 700,
      thisMonth: 3000,
    });
    expect(payload.topFiles[0]).toEqual({ name: "movie.mp4", count: 2 });
    expect(payload.topUploadedFiles[0]).toEqual({
      name: "draft.docx",
      count: 1,
    });
    expect(payload.topUsers[0]).toEqual({
      email: "admin@example.com",
      count: 3,
    });
    expect(payload.fileTypeDistribution).toContainEqual({
      type: "MP4",
      count: 2,
    });

    const totalDownloadsToday = payload.downloadsToday.reduce(
      (acc: number, item: { downloads: number }) => acc + item.downloads,
      0,
    );
    expect(totalDownloadsToday).toBe(2);
  });

  it("returns 500 when stats query fails", async () => {
    mockQueryRawUnsafe.mockRejectedValue(new Error("database unavailable"));

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/stats"),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to fetch admin stats.",
    });
  });
});
