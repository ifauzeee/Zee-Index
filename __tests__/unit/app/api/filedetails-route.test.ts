import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockValidateShareToken,
  mockGetAnyFileDetails,
  mockIsAccessRestricted,
  mockCheckLocalStorageAccess,
} = vi.hoisted(() => ({
  mockValidateShareToken: vi.fn(),
  mockGetAnyFileDetails: vi.fn(),
  mockIsAccessRestricted: vi.fn(),
  mockCheckLocalStorageAccess: vi.fn(),
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
  checkLocalStorageAccess: mockCheckLocalStorageAccess,
}));

vi.mock("@/lib/storage", () => ({
  getAnyFileDetails: mockGetAnyFileDetails,
}));

vi.mock("@/lib/securityUtils", () => ({
  isAccessRestricted: mockIsAccessRestricted,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET } from "@/app/api/filedetails/route";

function makeRequest(fileId: string | null) {
  const url = fileId
    ? `http://localhost:3000/api/filedetails?fileId=${encodeURIComponent(fileId)}`
    : "http://localhost:3000/api/filedetails";
  return new NextRequest(url);
}

describe("app/api/filedetails route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnyFileDetails.mockResolvedValue({
      id: "file-123",
      name: "test.mp4",
      mimeType: "video/mp4",
    });
    mockIsAccessRestricted.mockResolvedValue(false);
    mockCheckLocalStorageAccess.mockResolvedValue(true);
  });

  it("returns file details", async () => {
    const response = await GET(makeRequest("file-123"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "file-123",
      name: "test.mp4",
      mimeType: "video/mp4",
    });
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
    await expect(response.json()).resolves.toEqual({
      error: "Access Denied",
    });
  });

  it("returns 500 on error", async () => {
    mockGetAnyFileDetails.mockRejectedValue(new Error("storage error"));

    const response = await GET(makeRequest("file-123"));

    expect(response.status).toBe(500);
  });
});
