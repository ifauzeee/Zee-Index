import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetActivityLogs, mockDbActivityLogDeleteMany, mockKvDel } =
  vi.hoisted(() => ({
    mockGetActivityLogs: vi.fn(),
    mockDbActivityLogDeleteMany: vi.fn(),
    mockKvDel: vi.fn(),
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

vi.mock("@/lib/kv", () => ({
  kv: { del: mockKvDel },
}));

vi.mock("@/lib/db", () => ({
  db: { activityLog: { deleteMany: mockDbActivityLogDeleteMany } },
}));

import { GET, DELETE } from "@/app/api/admin/audit/route";

describe("app/api/admin/audit GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActivityLogs.mockResolvedValue([{ id: "1", action: "LOGIN" }]);
  });

  it("returns activity logs", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/audit"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([{ id: "1", action: "LOGIN" }]);
  });

  it("returns 500 on error", async () => {
    mockGetActivityLogs.mockRejectedValue(new Error("db error"));
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/audit"),
    );
    expect(response.status).toBe(500);
  });
});

describe("app/api/admin/audit DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbActivityLogDeleteMany.mockResolvedValue({ count: 5 });
    mockKvDel.mockResolvedValue(undefined);
  });

  it("clears logs and returns message", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/admin/audit", {
        method: "DELETE",
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Logs cleared" });
    expect(mockDbActivityLogDeleteMany).toHaveBeenCalled();
    expect(mockKvDel).toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    mockDbActivityLogDeleteMany.mockRejectedValue(new Error("db error"));
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/admin/audit", {
        method: "DELETE",
      }),
    );
    expect(response.status).toBe(500);
  });
});
