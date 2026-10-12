import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockValidateShareToken,
  mockGetAnyFileDetails,
  mockIsAccessRestricted,
  mockCheckLocalStorageAccess,
  mockGetPublicAppConfig,
} = vi.hoisted(() => ({
  mockValidateShareToken: vi.fn(),
  mockGetAnyFileDetails: vi.fn(),
  mockIsAccessRestricted: vi.fn(),
  mockCheckLocalStorageAccess: vi.fn(),
  mockGetPublicAppConfig: vi.fn(),
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

vi.mock("@/lib/app-config", () => ({
  getPublicAppConfig: mockGetPublicAppConfig,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET } from "@/app/api/filedetails/route";
import { ERROR_MESSAGES } from "@/lib/constants";

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
    mockGetPublicAppConfig.mockResolvedValue({ hideAuthor: false });
  });

  it("omits author data when the admin set hideAuthor", async () => {
    mockGetPublicAppConfig.mockResolvedValue({ hideAuthor: true });
    mockGetAnyFileDetails.mockResolvedValue({
      id: "file-123",
      name: "test.mp4",
      mimeType: "video/mp4",
      owners: [{ displayName: "Operator" }],
      lastModifyingUser: { displayName: "Operator" },
    });

    const response = await GET(makeRequest("file-123"));
    const body = await response.json();

    expect(body.owners).toBeUndefined();
    expect(body.lastModifyingUser).toBeUndefined();
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

  it("forwards the session email so per-user grants can be honored", async () => {
    const response = await GET(makeRequest("file-123"));

    expect(response.status).toBe(200);
    expect(mockIsAccessRestricted).toHaveBeenCalledWith(
      "file-123",
      [],
      "user@example.com",
    );
  });

  it("passes the local unlock to the access check for local files", async () => {
    // Global local lock on: a user who already unlocked must not get 403 on
    // files that are not per-folder protected.
    mockIsAccessRestricted.mockImplementation(
      (_id: string, allowedTokens: string[]) =>
        Promise.resolve(!allowedTokens.includes("local-storage:")),
    );

    const response = await GET(makeRequest("local-storage:docs/report.pdf"));

    expect(response.status).toBe(200);
    expect(mockIsAccessRestricted).toHaveBeenCalledWith(
      "local-storage:docs/report.pdf",
      ["local-storage:"],
      "user@example.com",
    );
  });

  it("returns 400 for a local id that escapes the storage root", async () => {
    const response = await GET(makeRequest("local-storage:../../etc/passwd"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: ERROR_MESSAGES.INVALID_FILE_ID,
    });
    expect(mockGetAnyFileDetails).not.toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    mockGetAnyFileDetails.mockRejectedValue(new Error("storage error"));

    const response = await GET(makeRequest("file-123"));

    expect(response.status).toBe(500);
  });
});
