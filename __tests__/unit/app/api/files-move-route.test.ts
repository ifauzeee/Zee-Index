import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAccessToken, mockInvalidateFolderCache } = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockInvalidateFolderCache: vi.fn(),
}));

const { mockCanModifyAll } = vi.hoisted(() => ({
  mockCanModifyAll: vi.fn(),
}));

vi.mock("@/lib/editor-access", () => ({
  canModifyAll: mockCanModifyAll,
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
    mockCanModifyAll.mockResolvedValue(true);
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

  it("refuses a move the editor could not open", async () => {
    // e.g. moving a file out of a protected folder into a public one.
    mockCanModifyAll.mockResolvedValue(false);
    global.fetch = vi.fn();

    const response = await POST(makeRequest());

    expect(response.status).toBe(403);
    expect(mockCanModifyAll).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ["test-file-id", "old-folder-id", "new-folder-id"],
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("puts parent ids in the query string encoded", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "test-file-id" }),
    });

    await POST(makeRequest());

    expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe(
      "https://www.googleapis.com/drive/v3/files/test-file-id?addParents=new-folder-id&removeParents=old-folder-id",
    );
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
