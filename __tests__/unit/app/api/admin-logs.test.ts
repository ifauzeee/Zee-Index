import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockKvZRange, mockLoggerError } = vi.hoisted(() => ({
  mockKvZRange: vi.fn(),
  mockLoggerError: vi.fn(),
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
  kv: {
    zrange: mockKvZRange,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mockLoggerError,
  },
}));

import { GET } from "@/app/api/admin/logs/route";

describe("app/api/admin/logs route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed activity logs successfully", async () => {
    const mockLogs = [
      JSON.stringify({
        id: "log-1",
        action: "DOWNLOAD",
        details: { itemName: "doc.pdf" },
      }),
      {
        id: "log-2",
        action: "VIEW",
        details: { itemName: "img.png" },
      },
    ];
    mockKvZRange.mockResolvedValue(mockLogs);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/logs?offset=0"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.logs).toHaveLength(2);
    expect(body.logs[0].id).toBe("log-1");
    expect(body.logs[1].id).toBe("log-2");
    expect(body.hasMore).toBe(false);
  });

  it("handles parsing errors gracefully", async () => {
    const mockLogs = ["invalid-json-string"];
    mockKvZRange.mockResolvedValue(mockLogs);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/logs?offset=0"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.logs).toHaveLength(0);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it("returns 500 when Redis throws an error", async () => {
    mockKvZRange.mockRejectedValue(new Error("Redis offline"));

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/logs?offset=0"),
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Gagal mengambil log aktivitas.");
    expect(mockLoggerError).toHaveBeenCalled();
  });
});
