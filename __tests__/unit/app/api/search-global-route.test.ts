import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetAccessToken,
  mockGetAllDescendantFolders,
  mockSearchFilesInFolder,
  mockIsAccessRestricted,
  mockIsProtected,
  mockSearchIndexedFiles,
} = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockGetAllDescendantFolders: vi.fn(),
  mockSearchFilesInFolder: vi.fn(),
  mockIsAccessRestricted: vi.fn(),
  mockIsProtected: vi.fn(),
  mockSearchIndexedFiles: vi.fn(),
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
  getAllDescendantFolders: mockGetAllDescendantFolders,
  searchFilesInFolder: mockSearchFilesInFolder,
}));

vi.mock("@/lib/securityUtils", () => ({
  isAccessRestricted: mockIsAccessRestricted,
}));

vi.mock("@/lib/auth", () => ({
  isProtected: mockIsProtected,
  validateShareToken: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/search-index", () => ({
  searchIndexedFiles: mockSearchIndexedFiles,
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

import { GET } from "@/app/api/search/global/route";

function createRequest(
  searchParams: Record<string, string>,
  options?: { authHeader?: string },
) {
  const params = new URLSearchParams(searchParams).toString();
  const headers: Record<string, string> = {};
  if (options?.authHeader) {
    headers["authorization"] = options.authHeader;
  }
  return new NextRequest(`http://localhost:3000/api/search/global?${params}`, {
    headers,
  });
}

describe("app/api/search/global route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHARE_SECRET_KEY = "test-share-secret";
    process.env.NEXT_PUBLIC_ROOT_FOLDER_ID = "root-folder-id";
    mockGetAccessToken.mockResolvedValue("mock-access-token");
    mockGetAllDescendantFolders.mockResolvedValue(["folder1", "folder2"]);
    mockSearchFilesInFolder.mockResolvedValue([]);
    mockIsAccessRestricted.mockResolvedValue(false);
    mockIsProtected.mockResolvedValue(false);
    mockSearchIndexedFiles.mockResolvedValue([]);

    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 400 when search term is missing", async () => {
    const response = await GET(createRequest({}));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Search term is required.",
    });
  });

  it("returns 500 when root folder ID is not configured", async () => {
    delete process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;

    const response = await GET(createRequest({ q: "test" }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Root folder ID is not configured.",
    });
  });

  it("returns empty results when no files found", async () => {
    mockSearchFilesInFolder.mockResolvedValue([]);

    const response = await GET(createRequest({ q: "nonexistent" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ files: [] });
    expect(mockGetAllDescendantFolders).toHaveBeenCalled();
  });

  it("searches across all descendant folders and returns merged results", async () => {
    mockSearchFilesInFolder
      .mockResolvedValueOnce([
        {
          id: "file1",
          name: "document.pdf",
          mimeType: "application/pdf",
          size: "1024",
          modifiedTime: "2024-01-01T00:00:00Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "file2",
          name: "image.png",
          mimeType: "image/png",
          size: "2048",
          modifiedTime: "2024-01-02T00:00:00Z",
        },
      ]);

    const response = await GET(createRequest({ q: "document" }));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.files).toHaveLength(2);
  });

  it("deduplicates files across folders", async () => {
    mockSearchFilesInFolder
      .mockResolvedValueOnce([
        {
          id: "duplicate-file",
          name: "shared.pdf",
          mimeType: "application/pdf",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "duplicate-file",
          name: "shared.pdf",
          mimeType: "application/pdf",
        },
      ]);

    const response = await GET(createRequest({ q: "shared" }));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.files).toHaveLength(1);
  });

  it("filters by mimeType", async () => {
    mockSearchFilesInFolder.mockResolvedValue([
      {
        id: "vid1",
        name: "video.mp4",
        mimeType: "video/mp4",
      },
    ]);

    const response = await GET(
      createRequest({ q: "video", mimeType: "video" }),
    );
    expect(response.status).toBe(200);
  });

  it("marks protected folders", async () => {
    mockSearchFilesInFolder.mockResolvedValue([
      {
        id: "protected-folder",
        name: "Secure",
        mimeType: "application/vnd.google-apps.folder",
      },
    ]);
    mockIsProtected.mockResolvedValue(true);

    const response = await GET(createRequest({ q: "Secure" }));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.files[0].isProtected).toBe(true);
  });

  it("filters out restricted files for non-admin users", async () => {
    mockSearchFilesInFolder.mockResolvedValue([
      {
        id: "restricted-file",
        name: "secret.pdf",
        mimeType: "application/pdf",
      },
      { id: "public-file", name: "public.pdf", mimeType: "application/pdf" },
    ]);
    mockIsAccessRestricted.mockImplementation((fileId: string) =>
      Promise.resolve(fileId === "restricted-file"),
    );

    const response = await GET(createRequest({ q: "pdf" }));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.files).toHaveLength(1);
    expect(data.files[0].id).toBe("public-file");
  });

  it("merges indexed files from Postgres", async () => {
    mockSearchFilesInFolder.mockResolvedValue([
      {
        id: "drive-file",
        name: "from-drive.pdf",
        mimeType: "application/pdf",
      },
    ]);
    mockSearchIndexedFiles.mockResolvedValue([
      {
        id: "indexed-file",
        name: "from-index.pdf",
        mimeType: "application/pdf",
        folderId: "folder1",
        source: "postgres",
        modifiedTime: new Date("2024-01-01"),
      },
    ]);

    const response = await GET(createRequest({ q: "pdf" }));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.files).toHaveLength(2);
  });

  it("handles partial folder search failures gracefully", async () => {
    mockSearchFilesInFolder
      .mockResolvedValueOnce([
        {
          id: "found-file",
          name: "found.pdf",
          mimeType: "application/pdf",
        },
      ])
      .mockRejectedValueOnce(new Error("folder access denied"));

    const response = await GET(createRequest({ q: "found" }));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.files).toHaveLength(1);
    expect(data.files[0].id).toBe("found-file");
  });

  it("returns 500 when getAccessToken fails", async () => {
    mockGetAccessToken.mockRejectedValue(new Error("auth failed"));

    const response = await GET(createRequest({ q: "test" }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Failed to perform global search.",
    });
  });
});
