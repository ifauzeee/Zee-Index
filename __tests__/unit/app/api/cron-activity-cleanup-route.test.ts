import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCleanupOldActivityLogs } = vi.hoisted(() => ({
  mockCleanupOldActivityLogs: vi.fn(),
}));

vi.mock("@/lib/activity-cleanup", () => ({
  cleanupOldActivityLogs: mockCleanupOldActivityLogs,
}));

import { GET } from "@/app/api/cron/activity-cleanup/route";

function createCronRequest(authHeader?: string) {
  return new NextRequest("http://localhost:3000/api/cron/activity-cleanup", {
    headers: authHeader ? { authorization: authHeader } : undefined,
  });
}

describe("app/api/cron/activity-cleanup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret-test";
    mockCleanupOldActivityLogs.mockResolvedValue(42);
  });

  it("returns 401 when authorization header is missing", async () => {
    const response = await GET(createCronRequest());
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Unauthorized",
    });
  });

  it("returns 200 with cleanup summary when authorized", async () => {
    const response = await GET(
      createCronRequest(`Bearer ${process.env.CRON_SECRET}`),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      deletedCount: 42,
      message: "Cleaned up 42 old activity log entries.",
    });
  });

  it("returns 500 when cleanup throws", async () => {
    mockCleanupOldActivityLogs.mockRejectedValue(new Error("db error"));

    const response = await GET(
      createCronRequest(`Bearer ${process.env.CRON_SECRET}`),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "db error",
    });
  });
});
