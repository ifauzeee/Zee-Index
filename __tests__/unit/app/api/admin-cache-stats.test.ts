import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetKvCacheStats } = vi.hoisted(() => ({
  mockGetKvCacheStats: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => {
      return handler({ request });
    };
  },
}));

vi.mock("@/lib/kv", () => ({
  getKvCacheStats: mockGetKvCacheStats,
}));

import { GET } from "@/app/api/admin/cache-stats/route";

describe("app/api/admin/cache-stats route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKvCacheStats.mockReturnValue({
      hits: 10,
      misses: 5,
      hitRate: "66.7%",
      size: 3,
      evictions: 0,
    });
  });

  it("returns cache stats formatted payload", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/cache-stats"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cacheStats).toEqual({
      hits: 10,
      misses: 5,
      hitRate: "66.7%",
      size: 3,
      evictions: 0,
    });
    expect(body.info.hits).toBe("10 cache hits");
    expect(body.info.misses).toBe("5 cache misses");
  });
});
