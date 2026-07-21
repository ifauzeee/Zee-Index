import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockReindexDrive } = vi.hoisted(() => ({
  mockReindexDrive: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("@/lib/search-index", () => ({
  reindexDrive: mockReindexDrive,
}));

import { POST } from "@/app/api/admin/reindex/route";

describe("app/api/admin/reindex POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReindexDrive.mockResolvedValue({ indexed: 42, failed: 0 });
  });

  it("triggers reindex and returns result", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/reindex", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: "Reindex complete",
      indexed: 42,
      failed: 0,
    });
  });

  it("returns 500 on error", async () => {
    mockReindexDrive.mockRejectedValue(new Error("reindex failed"));
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/reindex", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(500);
  });
});
