import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetActivityLogs, mockDbCount } = vi.hoisted(() => ({
  mockGetActivityLogs: vi.fn(),
  mockDbCount: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("@/lib/activityLogger", () => ({
  getActivityLogs: mockGetActivityLogs,
}));

vi.mock("@/lib/db", () => ({
  db: { activityLog: { count: mockDbCount } },
}));

import { GET } from "@/app/api/admin/activity-log/route";

describe("app/api/admin/activity-log GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActivityLogs.mockResolvedValue([{ id: "1", action: "LOGIN" }]);
    mockDbCount.mockResolvedValue(1);
  });

  it("returns paginated activity logs with default pagination", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/activity-log"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("logs");
    expect(body).toHaveProperty("totalPages", 1);
    expect(body).toHaveProperty("currentPage", 1);
    expect(body).toHaveProperty("totalLogs", 1);
    expect(body.logs).toEqual([{ id: "1", action: "LOGIN" }]);
  });

  it("passes page and limit query params", async () => {
    mockDbCount.mockResolvedValue(150);
    mockGetActivityLogs.mockResolvedValue([]);
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/activity-log?page=3&limit=10",
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      logs: [],
      totalPages: 15,
      currentPage: 3,
      totalLogs: 150,
    });
  });

  it("returns 400 for invalid query params", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/activity-log?page=0"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mockGetActivityLogs.mockRejectedValue(new Error("db error"));
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/activity-log"),
    );
    expect(response.status).toBe(500);
  });
});
