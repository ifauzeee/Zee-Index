import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetSecurityLogs } = vi.hoisted(() => ({
  mockGetSecurityLogs: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("@/lib/activityLogger", () => ({
  getSecurityLogs: mockGetSecurityLogs,
}));

import { GET } from "@/app/api/admin/logs/security/route";

describe("app/api/admin/logs/security GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSecurityLogs.mockResolvedValue([
      { id: "1", event: "FAILED_LOGIN", timestamp: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("returns security logs", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/logs/security"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([
      { id: "1", event: "FAILED_LOGIN", timestamp: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("returns 500 on error", async () => {
    mockGetSecurityLogs.mockRejectedValue(new Error("db error"));
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/logs/security"),
    );
    expect(response.status).toBe(500);
  });
});
