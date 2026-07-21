import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAccessToken, mockInvalidateFolderCache, mockLogActivity } =
  vi.hoisted(() => ({
    mockGetAccessToken: vi.fn(),
    mockInvalidateFolderCache: vi.fn(),
    mockLogActivity: vi.fn(),
  }));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async (request: NextRequest) =>
      handler({
        request,
        body: { fileIds: ["file-1", "file-2"], parentId: "parent-folder-id" },
        session: { user: { email: "admin@test.com" } },
      });
  },
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
}));

vi.mock("@/lib/cache", () => ({
  invalidateFolderCache: mockInvalidateFolderCache,
}));

vi.mock("@/lib/activityLogger", () => ({
  logActivity: mockLogActivity,
}));

import { POST } from "@/app/api/files/bulk-delete/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/files/bulk-delete", {
    method: "POST",
  });
}

describe("app/api/files/bulk-delete route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockResolvedValue("test-access-token");
  });

  it("bulk deletes files successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("2 item berhasil dihapus");
    expect(mockInvalidateFolderCache).toHaveBeenCalledWith("parent-folder-id");
  });

  it("returns 207 with partial failure message", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 204 })
      .mockResolvedValueOnce({ ok: false, status: 403 });

    const response = await POST(makeRequest());

    expect(response.status).toBe(207);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain("1 item berhasil dihapus, 1 gagal");
  });

  it("returns 500 on unexpected error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
  });
});
