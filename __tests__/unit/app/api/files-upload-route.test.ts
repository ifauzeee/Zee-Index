import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAccessToken, mockInvalidateFolderCache, mockLogActivity } =
  vi.hoisted(() => ({
    mockGetAccessToken: vi.fn(),
    mockInvalidateFolderCache: vi.fn(),
    mockLogActivity: vi.fn(),
  }));

vi.mock("@/lib/api-middleware", () => ({
  createEditorRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async (request: NextRequest) =>
      handler({
        request,
        session: { user: { email: "editor@test.com" } },
        query: { type: "init" },
      });
  },
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
}));

vi.mock("@/lib/activityLogger", () => ({
  logActivity: mockLogActivity,
}));

vi.mock("@/lib/cache", () => ({
  invalidateFolderCache: mockInvalidateFolderCache,
}));

import { POST } from "@/app/api/files/upload/route";

function makeRequest(
  body: object | null,
  url = "http://localhost:3000/api/files/upload?type=init",
) {
  const req = new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (body) {
    Object.defineProperty(req, "json", {
      value: () => Promise.resolve(body),
    });
  }
  return req;
}

describe("app/api/files/upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockResolvedValue("test-access-token");
  });

  it("initializes a resumable upload", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: new Map([["Location", "https://googleapis.com/upload-url"]]),
    });

    const response = await POST(
      makeRequest({
        name: "test.txt",
        mimeType: "text/plain",
        parentId: "parent-123",
        size: 1024,
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.uploadUrl).toBe("https://googleapis.com/upload-url");
  });

  it("returns 400 for invalid init body", async () => {
    const response = await POST(makeRequest({ name: "" }));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("tidak valid");
  });

  it("handles local-storage upload init", async () => {
    const response = await POST(
      makeRequest({
        name: "local.txt",
        mimeType: "text/plain",
        parentId: "local-storage:/data",
        size: 512,
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.uploadUrl).toContain("local-storage-upload://");
  });

  it("handles Google Drive upload failure", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
    });

    const response = await POST(
      makeRequest({
        name: "test.txt",
        mimeType: "text/plain",
        parentId: "parent-123",
        size: 1024,
      }),
    );

    expect(response.status).toBe(500);
  });
});
