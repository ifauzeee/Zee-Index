import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetAccessToken,
  mockIsAccessRestricted,
  mockLoadAsync,
  mockGetFileDetailsFromDrive,
} = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockIsAccessRestricted: vi.fn(),
  mockLoadAsync: vi.fn(),
  mockGetFileDetailsFromDrive: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createUserRoute: (
    handler: (ctx: {
      request: NextRequest;
      session: { user: { email: string; role: string } };
    }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) =>
      handler({
        request,
        session: { user: { email: "user@example.com", role: "USER" } },
      });
  },
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
  getFileDetailsFromDrive: mockGetFileDetailsFromDrive,
}));

vi.mock("@/lib/securityUtils", () => ({
  isAccessRestricted: mockIsAccessRestricted,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("jszip", () => ({
  default: {
    loadAsync: mockLoadAsync,
  },
}));

import { GET } from "@/app/api/archive-preview/route";
import { ARCHIVE_PREVIEW_MAX_BYTES } from "@/lib/constants";

function makeRequest(fileId: string | null) {
  const url = fileId
    ? `http://localhost:3000/api/archive-preview?fileId=${encodeURIComponent(fileId)}`
    : "http://localhost:3000/api/archive-preview";
  return new NextRequest(url);
}

describe("app/api/archive-preview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockResolvedValue("test-token");
    mockIsAccessRestricted.mockResolvedValue(false);
    mockGetFileDetailsFromDrive.mockResolvedValue({
      id: "zip-file-id",
      name: "bundle.zip",
      mimeType: "application/zip",
      size: "1024",
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
  });

  it("returns archive contents", async () => {
    mockLoadAsync.mockResolvedValue({
      files: {
        "readme.txt": {
          name: "readme.txt",
          dir: false,
          _data: { uncompressedSize: 100 },
        },
        "photos/": {
          name: "photos/",
          dir: true,
          _data: { uncompressedSize: 0 },
        },
      },
    });

    const response = await GET(makeRequest("zip-file-id"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual([
      { name: "readme.txt", size: 100, isFolder: false },
      { name: "photos/", size: 0, isFolder: true },
    ]);
  });

  it("returns 400 for a fileId with unsafe characters", async () => {
    const response = await GET(makeRequest("../about"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid fileId format.",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("passes the session email to the access check", async () => {
    const response = await GET(makeRequest("zip-file-id"));

    expect(response.status).toBe(200);
    expect(mockIsAccessRestricted).toHaveBeenCalledWith(
      "zip-file-id",
      [],
      "user@example.com",
    );
  });

  it("returns 404 when the file no longer exists in Drive", async () => {
    mockGetFileDetailsFromDrive.mockResolvedValue(null);

    const response = await GET(makeRequest("zip-file-id"));

    expect(response.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 413 when the archive exceeds the preview size cap", async () => {
    mockGetFileDetailsFromDrive.mockResolvedValue({
      id: "zip-file-id",
      name: "huge.zip",
      mimeType: "application/zip",
      size: String(ARCHIVE_PREVIEW_MAX_BYTES + 1),
    });

    const response = await GET(makeRequest("zip-file-id"));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Archive too large to preview.",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 400 when fileId is missing", async () => {
    const response = await GET(makeRequest(null));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Parameter fileId tidak ditemukan.",
    });
  });

  it("returns 403 when access is restricted", async () => {
    mockIsAccessRestricted.mockResolvedValue(true);

    const response = await GET(makeRequest("restricted-id"));

    expect(response.status).toBe(403);
  });

  it("returns 500 on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const response = await GET(makeRequest("file-id"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Gagal memproses file arsip.",
    });
  });
});
