import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockGetAccessToken, mockIsAccessRestricted, mockListFilesFromDrive } =
  vi.hoisted(() => ({
    mockGetAccessToken: vi.fn(),
    mockIsAccessRestricted: vi.fn(),
    mockListFilesFromDrive: vi.fn(),
  }));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
  listFilesFromDrive: mockListFilesFromDrive,
}));

vi.mock("@/lib/securityUtils", () => ({
  isAccessRestricted: mockIsAccessRestricted,
}));

vi.mock("jszip", () => {
  const MockJSZip = vi.fn().mockImplementation(function () {
    return {
      file: vi.fn(),
      generateAsync: vi
        .fn()
        .mockResolvedValue(new Blob(["fake-zip"], { type: "application/zip" })),
    };
  });
  return { default: MockJSZip };
});

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (context: {
      request: NextRequest;
      body?: { fileIds?: string[]; folderId?: string };
      session?: { user?: { role?: string; email?: string } };
    }) => Promise<Response>,
    options?: {
      includeSession?: boolean;
      bodySchema?: {
        safeParse: (value: unknown) => {
          success: boolean;
          data?: unknown;
          error?: { issues: unknown[] };
        };
      };
    },
  ) => {
    return async (request: NextRequest) => {
      let body: { fileIds?: string[]; folderId?: string } | undefined;
      if (options?.bodySchema) {
        try {
          const rawBody = await request.json();
          const parsedBody = options.bodySchema.safeParse(rawBody);
          if (!parsedBody.success) {
            return NextResponse.json(
              {
                error: "Invalid request body.",
                details: parsedBody.error?.issues ?? [],
              },
              { status: 400 },
            );
          }
          body = parsedBody.data as { fileIds?: string[]; folderId?: string };
        } catch {
          return NextResponse.json(
            { error: "Invalid request body.", details: [] },
            { status: 400 },
          );
        }
      }
      return await handler({
        request,
        body,
        session: { user: { role: "USER", email: "user@test.com" } },
      });
    };
  },
}));

import { POST } from "@/app/api/bulk-download/route";

function createRequest(body?: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/bulk-download", {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("app/api/bulk-download route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockResolvedValue("mock-access-token");
    mockIsAccessRestricted.mockResolvedValue(false);
    mockListFilesFromDrive.mockResolvedValue({
      files: [],
      nextPageToken: null,
    });
  });

  it("returns 400 when fileIds is missing", async () => {
    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 400 when fileIds is empty", async () => {
    const response = await POST(createRequest({ fileIds: [] }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when fileIds exceeds 20", async () => {
    const manyIds = Array.from({ length: 21 }, (_, i) => "file" + i);
    const response = await POST(createRequest({ fileIds: manyIds }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when neither fileIds nor folderId is provided", async () => {
    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 200 with zip of one-level folder contents, skipping folders", async () => {
    mockListFilesFromDrive.mockResolvedValue({
      files: [
        { id: "f1", name: "a.txt", mimeType: "text/plain" },
        {
          id: "f2",
          name: "Nested",
          mimeType: "application/vnd.google-apps.folder",
        },
      ],
      nextPageToken: null,
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const response = await POST(createRequest({ folderId: "root" }));

    expect(response.status).toBe(200);
    expect(mockListFilesFromDrive).toHaveBeenCalledWith(
      "root",
      null,
      200,
      false,
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns 200 with zip when valid fileIds provided", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ name: "document.pdf" }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const response = await POST(createRequest({ fileIds: ["file1"] }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="download.zip"',
    );
    expect(mockGetAccessToken).toHaveBeenCalled();
  });

  it("skips restricted files for non-admin users", async () => {
    mockIsAccessRestricted.mockResolvedValue(true);
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const response = await POST(
      createRequest({ fileIds: ["restricted-file"] }),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips files that fail to fetch details", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    vi.stubGlobal("fetch", mockFetch);

    const response = await POST(createRequest({ fileIds: ["missing-file"] }));

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when getAccessToken throws", async () => {
    mockGetAccessToken.mockRejectedValue(new Error("auth failed"));

    const response = await POST(createRequest({ fileIds: ["file1"] }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal Server Error.",
    });
  });

  it("returns 500 when fetch throws network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", mockFetch);

    const response = await POST(createRequest({ fileIds: ["file1"] }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal Server Error.",
    });
  });
});
