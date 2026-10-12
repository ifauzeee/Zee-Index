import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockValidateShareToken,
  mockCollectAccessTokens,
  mockGetFolderPath,
  mockGetAllowedRootIds,
  mockRedactRestrictedPath,
  sessionRef,
} = vi.hoisted(() => ({
  mockValidateShareToken: vi.fn(),
  mockCollectAccessTokens: vi.fn(),
  mockGetFolderPath: vi.fn(),
  mockGetAllowedRootIds: vi.fn(),
  mockRedactRestrictedPath: vi.fn(),
  sessionRef: {
    current: { user: { email: "user@example.com", role: "USER" } } as {
      user: { email: string; role: string };
    } | null,
  },
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute:
    (
      handler: (ctx: {
        request: NextRequest;
        session: typeof sessionRef.current;
      }) => Promise<Response>,
    ) =>
    (request: NextRequest) =>
      handler({ request, session: sessionRef.current }),
}));

vi.mock("@/lib/auth", () => ({
  validateShareToken: mockValidateShareToken,
  collectAccessTokens: mockCollectAccessTokens,
}));

vi.mock("@/lib/drive", () => ({
  getFolderPath: mockGetFolderPath,
}));

vi.mock("@/lib/securityUtils", () => ({
  getAllowedRootIds: mockGetAllowedRootIds,
  redactRestrictedPath: mockRedactRestrictedPath,
}));

vi.mock("@/lib/storage/providers", () => ({
  getActiveProvider: () => null,
  isProviderId: () => false,
}));

import { GET } from "@/app/api/folderpath/route";

const PATH = [
  { id: "root-id", name: "Google Drive" },
  { id: "secret-id", name: "Payroll 2026" },
  { id: "child-id", name: "Q3" },
];

function makeRequest(folderId: string | null, cookie?: string) {
  const url = folderId
    ? `http://localhost:3000/api/folderpath?folderId=${encodeURIComponent(folderId)}`
    : "http://localhost:3000/api/folderpath";
  return new NextRequest(url, cookie ? { headers: { cookie } } : undefined);
}

describe("app/api/folderpath route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionRef.current = { user: { email: "user@example.com", role: "USER" } };
    mockValidateShareToken.mockResolvedValue(false);
    mockCollectAccessTokens.mockResolvedValue([]);
    mockGetFolderPath.mockResolvedValue(PATH);
    mockGetAllowedRootIds.mockResolvedValue(new Set(["root-id"]));
    mockRedactRestrictedPath.mockImplementation(async (path) => path);
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
    await expect(response.json()).resolves.toEqual([
      { id: "local-storage:", name: "Local Storage" },
      { id: "local-storage:movies/", name: "movies" },
      { id: "local-storage:movies/action/", name: "action" },
    ]);
  });

  it("returns 400 when folderId is missing", async () => {
    const response = await GET(makeRequest(null));

    expect(response.status).toBe(400);
  });

  it("returns 404 for a folder whose path does not start at an allowed root", async () => {
    // e.g. a folder in the account's own My Drive, outside the index.
    mockGetFolderPath.mockResolvedValue([
      { id: "my-drive-root", name: "My Drive" },
      { id: "personal", name: "Tax returns" },
    ]);

    const response = await GET(makeRequest("personal"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("Tax returns");
  });

  it("returns 404 when the path could not be resolved", async () => {
    mockGetFolderPath.mockResolvedValue([]);

    expect((await GET(makeRequest("missing"))).status).toBe(404);
  });

  it("redacts the path with the tokens the browser holds", async () => {
    mockCollectAccessTokens.mockResolvedValue(["secret-id"]);
    mockRedactRestrictedPath.mockResolvedValue([
      PATH[0],
      { id: "secret-id", name: "Locked folder" },
      { id: "child-id", name: "Locked folder" },
    ]);

    const response = await GET(
      makeRequest("child-id", "folder_token_secret-id=abc"),
    );

    expect(response.status).toBe(200);
    expect(mockCollectAccessTokens).toHaveBeenCalledWith(
      [{ name: "folder_token_secret-id", value: "abc" }],
      undefined,
    );
    expect(mockRedactRestrictedPath).toHaveBeenCalledWith(
      PATH,
      ["secret-id"],
      "user@example.com",
      "Locked folder",
    );
    const body = await response.json();
    expect(body[1]).toEqual({ id: "secret-id", name: "Locked folder" });
  });

  it("returns the full path to admins without scoping or redaction", async () => {
    sessionRef.current = {
      user: { email: "admin@example.com", role: "ADMIN" },
    };
    mockGetFolderPath.mockResolvedValue([
      { id: "my-drive-root", name: "My Drive" },
    ]);

    const response = await GET(makeRequest("my-drive-root"));

    expect(response.status).toBe(200);
    expect(mockGetAllowedRootIds).not.toHaveBeenCalled();
    expect(mockRedactRestrictedPath).not.toHaveBeenCalled();
  });

  it("returns 500 when the path lookup fails", async () => {
    mockGetFolderPath.mockRejectedValue(new Error("network error"));

    expect((await GET(makeRequest("child-id"))).status).toBe(500);
  });
});
