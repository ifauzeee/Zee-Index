import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockAuth,
  mockGetVerifiedSession,
  mockCheckRateLimit,
  mockJwtVerify,
  mockKvGet,
  mockFindUnique,
  mockIsAccessRestricted,
  mockCheckLocalStorageAccess,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetVerifiedSession: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockJwtVerify: vi.fn(),
  mockKvGet: vi.fn(),
  mockFindUnique: vi.fn(),
  mockIsAccessRestricted: vi.fn(),
  mockCheckLocalStorageAccess: vi.fn(),
}));

vi.mock("@/lib/verified-session", () => ({
  getVerifiedSession: mockGetVerifiedSession,
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/auth", () => ({
  checkLocalStorageAccess: mockCheckLocalStorageAccess,
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("jose", () => ({
  jwtVerify: mockJwtVerify,
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    get: mockKvGet,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    shareLink: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("@/lib/securityUtils", () => ({
  isAccessRestricted: mockIsAccessRestricted,
}));

import {
  validateDownloadRequest,
  prepareGoogleDriveUrl,
  prepareResponseHeaders,
} from "@/lib/services/download";
import { ERROR_MESSAGES } from "@/lib/constants";

describe("lib/services/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHARE_SECRET_KEY =
      "test-share-secret-key-with-at-least-32-chars";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    mockGetVerifiedSession.mockResolvedValue(null);
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockKvGet.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue(null);
    mockIsAccessRestricted.mockResolvedValue(false);
  });

  describe("validateDownloadRequest", () => {
    it("returns 429 when the download rate limit is exceeded", async () => {
      mockCheckRateLimit.mockResolvedValueOnce({ success: false });
      const request = new NextRequest(
        "http://localhost:3000/api/download?fileId=file-1",
      );

      const result = await validateDownloadRequest(request);

      expect(result.error).toEqual({
        error: ERROR_MESSAGES.DOWNLOAD_LIMIT_EXCEEDED,
        status: 429,
      });
    });

    it("applies rate limiting to ranged requests too", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/download?fileId=file-1",
        {
          headers: { range: "bytes=0-1023", "x-forwarded-for": "10.0.0.5" },
        },
      );

      await validateDownloadRequest(request);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        request,
        "API",
        "10.0.0.5:file-1",
      );
    });

    it("returns 400 when the fileId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/download");

      const result = await validateDownloadRequest(request);

      expect(result.error).toEqual({
        error: ERROR_MESSAGES.MISSING_FILE_ID,
        status: 400,
      });
    });

    it("returns 400 when the fileId format is invalid", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/download?fileId=invalid^file!",
      );

      const result = await validateDownloadRequest(request);

      expect(result.error).toEqual({
        error: ERROR_MESSAGES.INVALID_FILE_ID,
        status: 400,
      });
    });

    it("rejects revoked share tokens", async () => {
      mockJwtVerify.mockResolvedValueOnce({ payload: { jti: "share-1" } });
      mockKvGet.mockResolvedValueOnce("1");

      const request = new NextRequest(
        "http://localhost:3000/api/download?fileId=file-1&share_token=token",
      );

      const result = await validateDownloadRequest(request);

      expect(result.error).toEqual({
        error: ERROR_MESSAGES.SHARE_LINK_REVOKED,
        status: 401,
      });
    });

    it("rejects restricted downloads without a folder token", async () => {
      mockIsAccessRestricted.mockResolvedValueOnce(true);

      const request = new NextRequest(
        "http://localhost:3000/api/download?fileId=file-1",
      );

      const result = await validateDownloadRequest(request);

      expect(result.error).toEqual({
        error: ERROR_MESSAGES.ACCESS_DENIED,
        status: 403,
      });
    });

    it("does not grant admin bypass to a session pending 2FA", async () => {
      // A pending-2FA admin session is downgraded to null by getVerifiedSession.
      mockAuth.mockResolvedValue({
        user: {
          email: "admin@example.com",
          role: "ADMIN",
          twoFactorRequired: true,
        },
      });
      mockGetVerifiedSession.mockResolvedValue(null);
      mockIsAccessRestricted.mockResolvedValue(true);
      const request = new NextRequest(
        "http://localhost:3000/api/download?fileId=abc123",
      );

      const { error } = await validateDownloadRequest(request);

      expect(error?.status).toBe(403);
    });

    it("enforces folder protection for a local file under a protected subfolder", async () => {
      mockCheckLocalStorageAccess.mockResolvedValue(true);
      mockIsAccessRestricted.mockResolvedValue(true);
      const request = new NextRequest(
        "http://localhost:3000/api/download?fileId=local-storage:private/report.pdf",
      );

      const { error } = await validateDownloadRequest(request);

      expect(error?.status).toBe(403);
      expect(mockIsAccessRestricted).toHaveBeenCalledWith(
        "local-storage:private/report.pdf",
        ["local-storage:"],
        undefined,
      );
    });

    it("lets an unlocked user download a local file under the global lock", async () => {
      mockCheckLocalStorageAccess.mockResolvedValue(true);
      mockIsAccessRestricted.mockImplementation(
        (_id: string, allowedTokens: string[]) =>
          Promise.resolve(!allowedTokens.includes("local-storage:")),
      );
      const request = new NextRequest(
        "http://localhost:3000/api/download?fileId=local-storage:docs/report.pdf",
      );

      const { error } = await validateDownloadRequest(request);

      expect(error).toBeUndefined();
      expect(mockIsAccessRestricted).toHaveBeenCalledWith(
        "local-storage:docs/report.pdf",
        ["local-storage:"],
        undefined,
      );
    });

    it("allows restricted downloads when a valid folder token is supplied", async () => {
      mockIsAccessRestricted.mockResolvedValue(false);
      mockJwtVerify.mockResolvedValueOnce({
        payload: { folderId: "folder-1" },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/download?fileId=file-1&access_token=token",
      );

      const result = await validateDownloadRequest(request);

      expect(result.error).toBeUndefined();
      expect(result.context.fileId).toBe("file-1");
      expect(result.context.accessTokenParam).toBe("token");
      expect(mockIsAccessRestricted).toHaveBeenCalledWith(
        "file-1",
        ["folder-1"],
        undefined,
      );
    });
  });

  describe("prepareGoogleDriveUrl", () => {
    it("uses media download for regular files", () => {
      const result = prepareGoogleDriveUrl("file-1", {
        mimeType: "video/mp4",
        name: "movie.mp4",
      });

      expect(result.url).toContain("/files/file-1?alt=media");
      expect(result.filename).toBe("movie.mp4");
      expect(result.mimeType).toBe("video/mp4");
    });

    it("exports Google docs to a download-friendly type", () => {
      const result = prepareGoogleDriveUrl("file-1", {
        mimeType: "application/vnd.google-apps.document",
        name: "Doc",
      });

      expect(result.url).toContain("/files/file-1/export");
      expect(result.filename).toMatch(/\.docx$/);
      expect(result.mimeType).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    });

    it("exports Google docs as PDF when requested for preview", () => {
      const result = prepareGoogleDriveUrl(
        "file-1",
        {
          mimeType: "application/vnd.google-apps.document",
          name: "Doc",
        },
        "pdf",
      );

      expect(result.url).toContain("/files/file-1/export");
      expect(result.url).toContain("mimeType=application%2Fpdf");
      expect(result.filename).toBe("Doc.pdf");
      expect(result.mimeType).toBe("application/pdf");
    });
  });

  describe("prepareResponseHeaders", () => {
    it("sets inline streaming headers for ranged media", () => {
      const upstreamResponse = new Response(null, {
        headers: {
          "Content-Range": "bytes 0-1023/4096",
          "Content-Length": "1024",
        },
      });

      const headers = prepareResponseHeaders(
        "video/mp4",
        "movie.mp4",
        "bytes=0-1023",
        "video",
        upstreamResponse,
      );

      expect(headers.get("Content-Type")).toBe("video/mp4");
      expect(headers.get("Content-Disposition")).toContain("inline");
      expect(headers.get("Content-Range")).toBe("bytes 0-1023/4096");
      expect(headers.get("Accept-Ranges")).toBe("bytes");
    });

    it.each([
      "text/html",
      "image/svg+xml",
      "text/javascript",
      "application/xhtml+xml",
    ])(
      "serves %s as an octet-stream attachment even for document navigation",
      (mime) => {
        const headers = prepareResponseHeaders(
          mime,
          "dangerous",
          null,
          "document",
          null,
        );

        expect(headers.get("Content-Type")).toBe("application/octet-stream");
        expect(headers.get("Content-Disposition")).toMatch(/^attachment/);
      },
    );

    it("keeps PNG inline for <img> loads", () => {
      const headers = prepareResponseHeaders(
        "image/png",
        "a.png",
        null,
        "image",
        null,
      );

      expect(headers.get("Content-Type")).toBe("image/png");
      expect(headers.get("Content-Disposition")).toMatch(/^inline/);
    });

    it("keeps text/vtt subtitles inline", () => {
      const headers = prepareResponseHeaders(
        "text/vtt",
        "a.vtt",
        null,
        "track",
        null,
      );

      expect(headers.get("Content-Type")).toBe("text/vtt");
      expect(headers.get("Content-Disposition")).toMatch(/^inline/);
    });

    it("keeps ranged video inline and marks it private", () => {
      const headers = prepareResponseHeaders(
        "video/mp4",
        "movie.mp4",
        "bytes=0-",
        "video",
        null,
      );

      expect(headers.get("Content-Disposition")).toMatch(/^inline/);
      expect(headers.get("Cache-Control")).toMatch(/^private/);
    });

    it("never marks downloads as publicly cacheable", () => {
      expect(
        prepareResponseHeaders("image/png", "a", null, "image", null).get(
          "Cache-Control",
        ),
      ).toMatch(/^private/);
      expect(
        prepareResponseHeaders("video/mp4", "a", "bytes=0-", "video", null).get(
          "Cache-Control",
        ),
      ).toMatch(/^private/);
    });
  });
});
