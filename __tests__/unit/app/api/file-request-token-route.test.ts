import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockKvHGet, mockKvHDel, mockParseFileRequestLink } = vi.hoisted(() => ({
  mockKvHGet: vi.fn(),
  mockKvHDel: vi.fn(),
  mockParseFileRequestLink: vi.fn(),
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    hget: mockKvHGet,
    hdel: mockKvHDel,
  },
}));

vi.mock("@/lib/link-payloads", () => ({
  parseFileRequestLink: mockParseFileRequestLink,
}));

import { GET } from "@/app/api/file-request/[token]/route";

function createRequest(token: string) {
  return new NextRequest(`http://localhost:3000/api/file-request/${token}`);
}

describe("app/api/file-request/[token] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when request data is not found", async () => {
    mockKvHGet.mockResolvedValue(null);

    const response = await GET(createRequest("nonexistent-token"));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found" });
    expect(mockKvHGet).toHaveBeenCalled();
  });

  it("returns 410 when request has expired", async () => {
    mockKvHGet.mockResolvedValue("some-data");
    mockParseFileRequestLink.mockReturnValue({
      title: "Upload Files",
      folderName: "Shared Folder",
      expiresAt: Date.now() - 1000,
      folderId: "folder1",
    });

    const response = await GET(createRequest("expired-token"));
    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({ error: "Expired" });
    expect(mockKvHDel).toHaveBeenCalled();
  });

  it("returns request details when valid", async () => {
    const future = Date.now() + 86400000;
    mockKvHGet.mockResolvedValue("some-data");
    mockParseFileRequestLink.mockReturnValue({
      title: "Upload Files",
      folderName: "Shared Folder",
      expiresAt: future,
      folderId: "folder1",
    });

    const response = await GET(createRequest("valid-token"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      title: "Upload Files",
      folderName: "Shared Folder",
      expiresAt: future,
      folderId: "folder1",
    });
  });

  it("returns 500 when kv throws", async () => {
    mockKvHGet.mockRejectedValue(new Error("redis down"));

    const response = await GET(createRequest("error-token"));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal Server Error",
    });
  });

  it("returns 500 when parseFileRequestLink throws", async () => {
    mockKvHGet.mockResolvedValue("some-data");
    mockParseFileRequestLink.mockImplementation(() => {
      throw new Error("parse error");
    });

    const response = await GET(createRequest("bad-token"));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal Server Error",
    });
  });
});
