import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockValidateShareToken, mockGetAccessToken, mockKvGet, mockKvSet } =
  vi.hoisted(() => ({
    mockValidateShareToken: vi.fn(),
    mockGetAccessToken: vi.fn(),
    mockKvGet: vi.fn(),
    mockKvSet: vi.fn(),
  }));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (ctx: {
      request: NextRequest;
      session?: { user?: { email?: string; role?: string } } | null;
    }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) =>
      handler({
        request,
        session: { user: { email: "user@example.com", role: "USER" } },
      });
  },
}));

vi.mock("@/lib/auth", () => ({
  validateShareToken: mockValidateShareToken,
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
}));

vi.mock("@/lib/kv", () => ({
  kv: { get: mockKvGet, set: mockKvSet },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET } from "@/app/api/folderpath/route";

function makeRequest(folderId: string | null) {
  const url = folderId
    ? `http://localhost:3000/api/folderpath?folderId=${encodeURIComponent(folderId)}`
    : "http://localhost:3000/api/folderpath";
  return new NextRequest(url);
}

describe("app/api/folderpath route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateShareToken.mockResolvedValue(false);
    mockGetAccessToken.mockResolvedValue("test-token");
    mockKvGet.mockResolvedValue(null);
    mockKvSet.mockResolvedValue(null);
  });

  it("returns path for virtual-root", async () => {
    const response = await GET(makeRequest("virtual-root"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { id: "virtual-root", name: "Home" },
    ]);
  });

  it("returns path for local-storage", async () => {
    const response = await GET(makeRequest("local-storage:movies/action/"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual([
      { id: "local-storage:", name: "Local Storage" },
      { id: "local-storage:movies/", name: "movies" },
      { id: "local-storage:movies/action/", name: "action" },
    ]);
  });

  it("returns cached path when available", async () => {
    mockKvGet.mockResolvedValue([{ id: "folder-1", name: "Cached Folder" }]);

    const response = await GET(makeRequest("folder-1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { id: "folder-1", name: "Cached Folder" },
    ]);
  });

  it("returns 400 when folderId is missing", async () => {
    const response = await GET(makeRequest(null));

    expect(response.status).toBe(400);
  });

  it("fetches folder path from Google Drive API (breaks at root)", async () => {
    // First call returns a file with parents; second call returns root (no parents)
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: "child-id",
          name: "Child Folder",
          parents: ["parent-id"],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: "parent-id",
          name: "Parent Folder",
        }),
      });

    const response = await GET(makeRequest("child-id"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual([
      { id: "parent-id", name: "Parent Folder" },
      { id: "child-id", name: "Child Folder" },
    ]);
  });

  it("returns 500 on fetch error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const response = await GET(makeRequest("child-id"));

    expect(response.status).toBe(500);
  });
});
