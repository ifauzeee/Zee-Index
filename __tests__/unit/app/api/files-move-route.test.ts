import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAccessToken, mockInvalidateFolderCache } = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockInvalidateFolderCache: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createEditorRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async (request: NextRequest) =>
      handler({
        request,
        body: {
          fileId: "test-file-id",
          newParentId: "new-folder-id",
          currentParentId: "old-folder-id",
        },
        session: { user: { email: "editor@test.com" } },
      });
  },
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
}));

vi.mock("@/lib/cache", () => ({
  invalidateFolderCache: mockInvalidateFolderCache,
}));

import { POST } from "@/app/api/files/move/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/files/move", {
    method: "POST",
  });
}

describe("app/api/files/move route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockResolvedValue("test-access-token");
  });

  it("moves a file successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: "test-file-id", parents: ["new-folder-id"] }),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockInvalidateFolderCache).toHaveBeenCalledWith("old-folder-id");
  });

  it("returns 500 on Google Drive API error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: { message: "Forbidden" } }),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
  });
});
