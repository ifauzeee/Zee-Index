import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  mockGetAccessToken,
  mockIsAccessRestricted,
  mockDbFindMany,
  mockIsPrivateFolder,
  mockKvGet,
  mockKvSet,
  mockJwtVerify,
} = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockIsAccessRestricted: vi.fn(),
  mockDbFindMany: vi.fn(),
  mockIsPrivateFolder: vi.fn(),
  mockKvGet: vi.fn(),
  mockKvSet: vi.fn(),
  mockJwtVerify: vi.fn(),
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
}));

vi.mock("@/lib/securityUtils", () => ({
  isAccessRestricted: mockIsAccessRestricted,
}));

vi.mock("@/lib/db", () => ({
  db: {
    protectedFolder: {
      findMany: mockDbFindMany,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  validateShareToken: vi.fn().mockResolvedValue(null),
  isPrivateFolder: mockIsPrivateFolder,
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    get: mockKvGet,
    set: mockKvSet,
  },
}));

vi.mock("jose", () => ({
  jwtVerify: mockJwtVerify,
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (context: {
      request: NextRequest;
      session?: { user?: { role?: string; email?: string } };
    }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => {
      return await handler({
        request,
        session: { user: { role: "USER", email: "user@test.com" } },
      });
    };
  },
}));

import { GET } from "@/app/api/search/route";

function createRequest(
  searchParams: Record<string, string>,
  options?: { authHeader?: string },
) {
  const params = new URLSearchParams(searchParams).toString();
  const headers: Record<string, string> = {};
  if (options?.authHeader) {
    headers["authorization"] = options.authHeader;
  }
  return new NextRequest(`http://localhost:3000/api/search?${params}`, {
    headers,
  });
}

function createDriveResponse(files: Record<string, unknown>[]) {
  return {
    ok: true,
    json: () => Promise.resolve({ files }),
  };
}

describe("app/api/search route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHARE_SECRET_KEY = "test-share-secret";
    mockGetAccessToken.mockResolvedValue("mock-access-token");
    mockIsAccessRestricted.mockResolvedValue(false);
    mockDbFindMany.mockResolvedValue([]);
    mockIsPrivateFolder.mockReturnValue(false);
    mockKvGet.mockResolvedValue(null);
    mockKvSet.mockResolvedValue(undefined);

    const mockFetch = vi.fn().mockResolvedValue(
      createDriveResponse([
        {
          id: "file1",
          name: "document.pdf",
          mimeType: "application/pdf",
          size: "1024",
          modifiedTime: "2024-01-01T00:00:00Z",
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns 400 when no search criteria provided", async () => {
    const response = await GET(createRequest({}));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Search criteria is required.",
    });
  });

  it("returns 400 when folderId format is invalid", async () => {
    const response = await GET(
      createRequest({ q: "test", folderId: "<script>" }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid folderId format.",
    });
  });

  it("returns 400 when folderId exceeds max length", async () => {
    const response = await GET(
      createRequest({ q: "test", folderId: "a".repeat(101) }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid folderId format.",
    });
  });

  it("returns cached results when available", async () => {
    const cachedResult = {
      files: [{ id: "cached-file", name: "cached.pdf" }],
    };
    mockKvGet.mockResolvedValue(cachedResult);

    const response = await GET(createRequest({ q: "cached" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(cachedResult);
    expect(mockGetAccessToken).not.toHaveBeenCalled();
  });

  it("searches by name and returns files", async () => {
    const response = await GET(createRequest({ q: "document" }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.files).toHaveLength(1);
    expect(data.files[0].name).toBe("document.pdf");
  });

  it("searches by fullText when searchType is fullText", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        createDriveResponse([
          { id: "file1", name: "notes.txt", mimeType: "text/plain" },
        ]),
      );
    vi.stubGlobal("fetch", mockFetch);

    const response = await GET(
      createRequest({ q: "meeting notes", searchType: "fullText" }),
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.files).toHaveLength(1);
  });

  it("filters by mimeType", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        createDriveResponse([
          { id: "img1", name: "photo.jpg", mimeType: "image/jpeg" },
        ]),
      );
    vi.stubGlobal("fetch", mockFetch);

    const response = await GET(
      createRequest({ q: "photo", mimeType: "image" }),
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.files).toHaveLength(1);
  });

  it("filters by modifiedTime=today", async () => {
    const mockFetch = vi.fn().mockResolvedValue(createDriveResponse([]));
    vi.stubGlobal("fetch", mockFetch);

    const response = await GET(
      createRequest({ q: "recent", modifiedTime: "today" }),
    );
    expect(response.status).toBe(200);
  });

  it("filters by minSize", async () => {
    const mockFetch = vi.fn().mockResolvedValue(createDriveResponse([]));
    vi.stubGlobal("fetch", mockFetch);

    const response = await GET(createRequest({ q: "large", minSize: "10" }));
    expect(response.status).toBe(200);
  });

  it("filters out restricted files for non-admin users", async () => {
    mockIsAccessRestricted.mockImplementation((fileId: string) =>
      Promise.resolve(fileId === "restricted-file"),
    );

    const mockFetch = vi.fn().mockResolvedValue(
      createDriveResponse([
        {
          id: "restricted-file",
          name: "secret.pdf",
          mimeType: "application/pdf",
        },
        { id: "public-file", name: "public.pdf", mimeType: "application/pdf" },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const response = await GET(createRequest({ q: "pdf" }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.files).toHaveLength(1);
    expect(data.files[0].id).toBe("public-file");
  });

  it("marks protected folders", async () => {
    mockDbFindMany.mockResolvedValue([{ folderId: "protected-folder" }]);

    const mockFetch = vi.fn().mockResolvedValue(
      createDriveResponse([
        {
          id: "protected-folder",
          name: "Secure",
          mimeType: "application/vnd.google-apps.folder",
        },
        {
          id: "regular-folder",
          name: "Public",
          mimeType: "application/vnd.google-apps.folder",
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const response = await GET(createRequest({ q: "folder" }));
    expect(response.status).toBe(200);
    const data = await response.json();
    const protectedFolder = data.files.find(
      (f: { id: string }) => f.id === "protected-folder",
    );
    expect(protectedFolder.isProtected).toBe(true);
  });

  it("returns 500 when Google Drive API fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: "API quota exceeded" } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const response = await GET(createRequest({ q: "test" }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Failed to perform search.",
    });
  });

  it("handles search without errors", async () => {
    const response = await GET(createRequest({ q: "search" }));
    expect(response.status).toBe(200);
  });
});
