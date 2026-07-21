import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetAccessToken,
  mockGetFileDetailsFromDrive,
  mockInvalidateFolderCache,
  mockLogActivity,
} = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockGetFileDetailsFromDrive: vi.fn(),
  mockInvalidateFolderCache: vi.fn(),
  mockLogActivity: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async (request: NextRequest) =>
      handler({
        request,
        body: { fileId: "test-file-id", destinationId: "dest-folder-id" },
        session: { user: { email: "admin@test.com" } },
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

vi.mock("@/lib/activityLogger", () => ({
  logActivity: mockLogActivity,
}));

import { POST } from "@/app/api/files/copy/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/files/copy", {
    method: "POST",
  });
}

describe("app/api/files/copy route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockResolvedValue("test-access-token");
    mockGetFileDetailsFromDrive.mockResolvedValue({
      name: "original.txt",
      parents: ["source-folder-id"],
    });
  });

  it("copies a file successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "copied-file-id",
          name: "Salinan dari original.txt",
        }),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.file.name).toBe("Salinan dari original.txt");
    expect(mockInvalidateFolderCache).toHaveBeenCalledWith("dest-folder-id");
  });

  it("returns 500 when source file not found", async () => {
    mockGetFileDetailsFromDrive.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Internal Server Error.");
  });

  it("throws when file has no parents", async () => {
    mockGetFileDetailsFromDrive.mockResolvedValue({
      name: "orphan.txt",
      parents: [],
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
  });

  it("handles Google Drive API error during copy", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Quota exceeded" } }),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.details).toContain("Quota exceeded");
  });
});
