import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetAccessToken,
  mockGetFileDetailsFromDrive,
  mockInvalidateFolderCache,
} = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockGetFileDetailsFromDrive: vi.fn(),
  mockInvalidateFolderCache: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createEditorRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async (request: NextRequest) =>
      handler({
        request,
        body: { fileId: "test-file-id", newContent: "updated content" },
        session: { user: { email: "editor@test.com" } },
      });
  },
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
  getFileDetailsFromDrive: mockGetFileDetailsFromDrive,
}));

vi.mock("@/lib/cache", () => ({
  invalidateFolderCache: mockInvalidateFolderCache,
}));

import { POST } from "@/app/api/files/update/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/files/update", {
    method: "POST",
  });
}

describe("app/api/files/update route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockResolvedValue("test-access-token");
    mockGetFileDetailsFromDrive.mockResolvedValue({
      name: "editable.txt",
      mimeType: "text/plain",
      parents: ["parent-folder-id"],
    });
  });

  it("updates file content successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "test-file-id", name: "editable.txt" }),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockInvalidateFolderCache).toHaveBeenCalledWith("parent-folder-id");
  });

  it("returns 500 when file details not found", async () => {
    mockGetFileDetailsFromDrive.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
  });

  it("handles Google Drive API error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: { message: "Forbidden" } }),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
  });
});
