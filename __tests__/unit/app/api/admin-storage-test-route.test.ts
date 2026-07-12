import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetActiveProvider } = vi.hoisted(() => ({
  mockGetActiveProvider: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("@/lib/storage/providers", () => ({
  getActiveProvider: mockGetActiveProvider,
}));

import { POST } from "@/app/api/admin/storage/test/route";

describe("app/api/admin/storage/test route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when no external provider is configured", async () => {
    mockGetActiveProvider.mockReturnValue(null);
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/storage/test", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it("returns success when the provider connects", async () => {
    mockGetActiveProvider.mockReturnValue({
      source: "s3",
      rootId: "s3:",
      listFiles: vi.fn().mockResolvedValue({ files: [], nextPageToken: null }),
    });
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/storage/test", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.provider).toBe("s3");
  });

  it("returns 502 when the provider connection fails", async () => {
    mockGetActiveProvider.mockReturnValue({
      source: "webdav",
      rootId: "webdav:",
      listFiles: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    });
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/storage/test", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("ECONNREFUSED");
  });
});
