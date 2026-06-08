import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockValidateDownloadRequest,
  mockPrepareGoogleDriveUrl,
  mockPrepareResponseHeaders,
  mockGetAccessToken,
  mockGetFileDetailsFromDrive,
  mockLogActivity,
  mockTrackBandwidth,
  mockKvGet,
  mockKvSet,
  mockShareLinkUpdate,
  mockLoggerInfo,
  mockLoggerError,
  mockLoggerWarn,
} = vi.hoisted(() => ({
  mockValidateDownloadRequest: vi.fn(),
  mockPrepareGoogleDriveUrl: vi.fn(),
  mockPrepareResponseHeaders: vi.fn(),
  mockGetAccessToken: vi.fn(),
  mockGetFileDetailsFromDrive: vi.fn(),
  mockLogActivity: vi.fn(),
  mockTrackBandwidth: vi.fn(),
  mockKvGet: vi.fn(),
  mockKvSet: vi.fn(),
  mockShareLinkUpdate: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerError: vi.fn(),
  mockLoggerWarn: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (context: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => {
      return await handler({ request });
    };
  },
}));

vi.mock("@/lib/services/download", () => ({
  validateDownloadRequest: mockValidateDownloadRequest,
  prepareGoogleDriveUrl: mockPrepareGoogleDriveUrl,
  prepareResponseHeaders: mockPrepareResponseHeaders,
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
  getFileDetailsFromDrive: mockGetFileDetailsFromDrive,
}));

vi.mock("@/lib/activityLogger", () => ({
  logActivity: mockLogActivity,
}));

vi.mock("@/lib/analyticsTracker", () => ({
  trackBandwidth: mockTrackBandwidth,
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    get: mockKvGet,
    set: mockKvSet,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    shareLink: {
      update: mockShareLinkUpdate,
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: mockLoggerWarn,
  },
}));

import { GET, HEAD } from "@/app/api/download/route";
import { ERROR_MESSAGES } from "@/lib/constants";

function createContext(overrides?: {
  fileId?: string;
  range?: string | null;
  shareRecord?: { jti: string } | undefined;
  email?: string;
}) {
  return {
    context: {
      fileId: overrides?.fileId ?? "file-123",
      shareToken: null,
      accessTokenParam: null,
      range: overrides?.range ?? null,
      isStream: !!overrides?.range,
      shareRecord: overrides?.shareRecord,
    },
    session: overrides?.email
      ? { user: { email: overrides.email } }
      : { user: { email: "user@example.com" } },
  };
}

describe("app/api/download route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockValidateDownloadRequest.mockResolvedValue(createContext());
    mockGetAccessToken.mockResolvedValue("access-token");
    mockGetFileDetailsFromDrive.mockResolvedValue({
      id: "file-123",
      name: "sample.mp4",
      mimeType: "video/mp4",
      size: "4",
    });
    mockPrepareGoogleDriveUrl.mockReturnValue({
      url: "https://www.googleapis.com/drive/v3/files/file-123?alt=media",
      mimeType: "video/mp4",
      filename: "sample.mp4",
    });
    mockPrepareResponseHeaders.mockImplementation(() => {
      return new Headers({ "Content-Type": "video/mp4" });
    });
    mockKvGet.mockResolvedValue(null);
    mockKvSet.mockResolvedValue("OK");
    mockLogActivity.mockResolvedValue(undefined);
    mockTrackBandwidth.mockResolvedValue(undefined);

    global.fetch = vi.fn().mockResolvedValue(
      new Response("data", {
        status: 200,
        headers: {
          "Content-Length": "4",
          "Content-Type": "video/mp4",
        },
      }),
    ) as unknown as typeof fetch;
  });

  it("returns validation error payload from download service", async () => {
    mockValidateDownloadRequest.mockResolvedValue({
      context: createContext().context,
      session: null,
      error: { error: "invalid request", status: 400 },
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/download?fileId=file-123"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid request",
    });
  });

  it("returns 404 when file metadata cannot be loaded", async () => {
    mockGetFileDetailsFromDrive.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/download?fileId=file-123"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: ERROR_MESSAGES.FILE_NOT_FOUND,
    });
  });

  it("handles HEAD request without downloading file stream", async () => {
    const response = await HEAD(
      new NextRequest("http://localhost:3000/api/download?fileId=file-123", {
        method: "HEAD",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.get("Content-Length")).toBe("4");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("passes PDF export requests through for Google Workspace previews", async () => {
    mockGetFileDetailsFromDrive.mockResolvedValue({
      id: "file-123",
      name: "Doc",
      mimeType: "application/vnd.google-apps.document",
      size: undefined,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/download?fileId=file-123&export=pdf",
      ),
    );

    expect(response.status).toBe(200);
    expect(mockPrepareGoogleDriveUrl).toHaveBeenCalledWith(
      "file-123",
      expect.objectContaining({
        mimeType: "application/vnd.google-apps.document",
      }),
      "pdf",
    );
  });

  it("marks preview responses as inline and no-store", async () => {
    mockPrepareResponseHeaders.mockImplementation(() => {
      return new Headers({
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="sample.pdf"',
        "Cache-Control": "public, max-age=31536000, immutable",
      });
    });

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/download?fileId=file-123&preview=1",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="sample.pdf"',
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate",
    );
  });

  it("streams file and records activity on successful GET", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/download?fileId=file-123"),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("data");

    expect(mockKvGet).toHaveBeenCalledWith(
      expect.stringContaining("loop_prevent:download:file-123"),
    );
    expect(mockKvSet).toHaveBeenCalledWith(
      expect.stringContaining("loop_prevent:download:file-123"),
      "1",
      { ex: 5 },
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      "DOWNLOAD",
      expect.objectContaining({
        itemName: "sample.mp4",
        itemId: "file-123",
      }),
    );
    expect(mockTrackBandwidth).toHaveBeenCalledWith(4);
  });

  it("returns upstream api error when google drive fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: "Upstream denied" },
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as unknown as typeof fetch;

    const response = await GET(
      new NextRequest("http://localhost:3000/api/download?fileId=file-123"),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Upstream denied",
    });
    expect(mockLoggerError).toHaveBeenCalled();
  });
});
