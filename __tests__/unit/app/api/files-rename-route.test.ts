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
        body: { fileId: "test-file-id", newName: "renamed.txt" },
        session: { user: { email: "editor@test.com" } },
      });
  },
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
  getFileDetailsFromDrive: vi
    .fn()
    .mockResolvedValue({ name: "original.txt", parents: ["parent-folder-id"] }),
}));

vi.mock("@/lib/cache", () => ({
  invalidateFolderCache: mockInvalidateFolderCache,
}));

import { POST } from "@/app/api/files/rename/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/files/rename", {
    method: "POST",
  });
}

describe("app/api/files/rename route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockResolvedValue("test-access-token");
  });

  it("renames a file successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "test-file-id", name: "renamed.txt" }),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.file.name).toBe("renamed.txt");
  });

  it("returns 500 on Google Drive API error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Not found" } }),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
  });
});
