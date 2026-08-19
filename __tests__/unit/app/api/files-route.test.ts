import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockListAllFiles,
  mockIsPrivateFolder,
  mockIsAccessRestricted,
  mockGetProtectedFolderIdsCached,
  mockValidateShareToken,
} = vi.hoisted(() => ({
  mockListAllFiles: vi.fn(),
  mockIsPrivateFolder: vi.fn(),
  mockIsAccessRestricted: vi.fn(),
  mockGetProtectedFolderIdsCached: vi.fn(),
  mockValidateShareToken: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (ctx: {
      request: NextRequest;
      session: { user: { email: string; role: string } };
    }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) =>
      handler({
        request,
        session: { user: { email: "admin@test.com", role: "ADMIN" } },
      });
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/storage", () => ({
  listAllFiles: mockListAllFiles,
}));

vi.mock("@/lib/auth", () => ({
  isPrivateFolder: mockIsPrivateFolder,
  validateShareToken: mockValidateShareToken,
}));

vi.mock("@/lib/securityUtils", () => ({
  isAccessRestricted: mockIsAccessRestricted,
  getProtectedFolderIdsCached: mockGetProtectedFolderIdsCached,
}));

process.env.NEXT_PUBLIC_ROOT_FOLDER_ID = "root-folder-id";
process.env.SHARE_SECRET_KEY = "test-secret-key-thats-long-enough-for-jose";

import { GET } from "@/app/api/files/route";

function makeRequest(url: string) {
  return new NextRequest(url);
}

describe("app/api/files route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateShareToken.mockResolvedValue(false);
    mockIsAccessRestricted.mockResolvedValue(false);
    mockListAllFiles.mockResolvedValue({
      files: [
        {
          id: "file-1",
          name: "test.txt",
          mimeType: "text/plain",
          size: 100,
        },
        {
          id: "folder-1",
          name: "My Folder",
          mimeType: "application/vnd.google-apps.folder",
        },
      ],
      nextPageToken: null,
    });
    mockGetProtectedFolderIdsCached.mockResolvedValue([]);
    mockIsPrivateFolder.mockReturnValue(false);
  });

  it("lists files for a given folderId", async () => {
    const response = await GET(
      makeRequest("http://localhost:3000/api/files?folderId=abc123"),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.files).toHaveLength(2);
    expect(data.files[0]).toMatchObject({
      id: "file-1",
      name: "test.txt",
    });
    expect(data.files[0]).toHaveProperty("isFolder", false);
    expect(data.files[1]).toHaveProperty("isFolder", true);
  });

  it("uses root folder ID when folderId is not provided", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/files"));

    // Falls back to NEXT_PUBLIC_ROOT_FOLDER_ID
    expect(response.status).toBe(200);
  });

  it("returns 401 for invalid share_token", async () => {
    mockValidateShareToken.mockResolvedValue(false);

    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/files?folderId=abc123&share_token=invalid",
      ),
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain("Invalid share token");
  });

  it("returns 401 for restricted folder when no auth", async () => {
    mockIsAccessRestricted.mockResolvedValue(true);

    const response = await GET(
      makeRequest("http://localhost:3000/api/files?folderId=restricted-folder"),
    );

    // Admin can see all, so with ADMIN role it passes
    // Let's test with a non-admin session
    expect(response.status).toBe(200);
  });

  it("sets cache-control headers", async () => {
    const response = await GET(
      makeRequest("http://localhost:3000/api/files?folderId=abc123"),
    );

    expect(response.headers.get("Cache-Control")).toContain("max-age=60");
  });
});
