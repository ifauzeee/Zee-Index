import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  mockCheckAuth,
  mockHandleAuthRedirect,
  mockJwtVerify,
  mockGetRootFolderId,
  mockGetAccessToken,
  mockFetchMetadata,
} = vi.hoisted(() => ({
  mockCheckAuth: vi.fn(),
  mockHandleAuthRedirect: vi.fn(),
  mockJwtVerify: vi.fn(),
  mockGetRootFolderId: vi.fn(),
  mockGetAccessToken: vi.fn(),
  mockFetchMetadata: vi.fn(),
}));

vi.mock("@/lib/auth-check", () => ({
  checkAuth: mockCheckAuth,
  handleAuthRedirect: mockHandleAuthRedirect,
}));

vi.mock("jose", () => ({
  jwtVerify: mockJwtVerify,
}));

vi.mock("@/lib/config", () => ({
  getRootFolderId: mockGetRootFolderId,
}));

vi.mock("@/lib/drive/auth", () => ({
  getAccessToken: mockGetAccessToken,
}));

vi.mock("@/lib/drive/fetchers", () => ({
  fetchMetadata: mockFetchMetadata,
}));

import {
  validateShareToken,
  validateFolderToken,
  handleFindPath,
} from "@/lib/middleware-helpers";

describe("lib/middleware-helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHARE_SECRET_KEY =
      "test-share-secret-key-with-at-least-32-chars";

    mockHandleAuthRedirect.mockImplementation(
      (request: NextRequest, pathname: string, error?: string) => {
        const redirectUrl = new URL("/login", request.url);
        redirectUrl.searchParams.set("callbackUrl", pathname);
        if (error) {
          redirectUrl.searchParams.set("error", error);
        }
        return NextResponse.redirect(redirectUrl);
      },
    );
  });

  describe("validateShareToken", () => {
    it("returns api 401 when the share token is invalid", async () => {
      mockJwtVerify.mockRejectedValueOnce(new Error("invalid token"));

      const request = new NextRequest("http://localhost:3000/api/files");
      const response = await validateShareToken(
        request,
        "bad-token",
        "/api/files",
        true,
        (incomingRequest) => NextResponse.next({ request: incomingRequest }),
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        error: "ShareLinkExpired",
      });
    });

    it("redirects guests to login when the share token requires authentication", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { loginRequired: true },
      });
      mockCheckAuth.mockResolvedValueOnce({ isAuthenticated: false });

      const request = new NextRequest("http://localhost:3000/share/demo");
      const response = await validateShareToken(
        request,
        "share-token",
        "/share/demo",
        false,
        () => NextResponse.next(),
      );

      expect(mockCheckAuth).toHaveBeenCalled();
      expect(mockHandleAuthRedirect).toHaveBeenCalledWith(
        request,
        "/share/demo",
        "GuestAccessDenied",
      );
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });
  });

  describe("validateFolderToken", () => {
    it("returns null when the folder token cookie is missing", async () => {
      const request = new NextRequest("http://localhost:3000/folder/demo");
      const response = await validateFolderToken(
        request,
        "folder-1",
        false,
        () => NextResponse.next(),
      );

      expect(response).toBeNull();
    });

    it("sets the folder authorization header when the token matches the folder", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { folderId: "folder-1" },
      });

      const request = new NextRequest("http://localhost:3000/folder/folder-1", {
        headers: {
          cookie: "folder_token_folder-1=valid-token",
        },
      });

      const response = await validateFolderToken(
        request,
        "folder-1",
        false,
        () => NextResponse.next(),
      );

      expect(response).not.toBeNull();
      expect(response?.headers.get("x-folder-authorized")).toBe("true");
    });
  });

  describe("handleFindPath", () => {
    it("redirects to root when the id parameter is missing", async () => {
      const request = new NextRequest("http://localhost:3000/findpath");

      const response = await handleFindPath(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/");
    });

    it("redirects folders directly to the folder page", async () => {
      mockGetAccessToken.mockResolvedValueOnce("access-token");
      mockFetchMetadata.mockResolvedValueOnce({
        id: "folder-1",
        name: "Protected Folder",
        mimeType: "application/vnd.google-apps.folder",
        parents: [],
        trashed: false,
      });

      const request = new NextRequest(
        "http://localhost:3000/findpath?id=folder-1",
      );

      const response = await handleFindPath(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/folder/folder-1",
      );
    });

    it("redirects files to the file detail route and preserves view mode", async () => {
      mockGetAccessToken.mockResolvedValueOnce("access-token");
      mockFetchMetadata.mockResolvedValueOnce({
        id: "file-1",
        name: "My File.mp4",
        mimeType: "video/mp4",
        parents: ["parent-1"],
        trashed: false,
      });
      mockGetRootFolderId.mockResolvedValueOnce("root-folder");

      const request = new NextRequest(
        "http://localhost:3000/findpath?id=file-1&view=true",
      );

      const response = await handleFindPath(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/folder/parent-1/file/file-1/my-file.mp4?view=true",
      );
    });
  });
});
