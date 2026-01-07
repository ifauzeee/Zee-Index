import { describe, it, expect, vi, beforeEach } from "vitest";
import { listSharedDrives, listFilesFromDrive } from "@/lib/drive/operations";

vi.mock("@/lib/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("@/lib/drive/auth", () => ({
  getAccessToken: vi.fn().mockResolvedValue("mock-access-token"),
}));

vi.mock("@/lib/drive/client", () => ({
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry } from "@/lib/drive/client";

describe("lib/drive/operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listSharedDrives", () => {
    it("returns a list of drives when API succeeds", async () => {
      const mockDrives = [{ id: "1", name: "Drive A" }];
      (fetchWithRetry as any).mockResolvedValue({
        ok: true,
        json: async () => ({ drives: mockDrives }),
      });

      const result = await listSharedDrives();
      expect(result).toEqual(mockDrives);
      expect(fetchWithRetry).toHaveBeenCalledWith(
        expect.stringContaining("drives"),
        expect.objectContaining({
          headers: { Authorization: "Bearer mock-access-token" },
        }),
      );
    });

    it("returns empty array on API failure", async () => {
      (fetchWithRetry as any).mockResolvedValue({
        ok: false,
      });

      const result = await listSharedDrives();
      expect(result).toEqual([]);
    });
  });

  describe("listFilesFromDrive", () => {
    it("returns processed files", async () => {
      const mockFiles = [
        {
          id: "1",
          name: "Folder",
          mimeType: "application/vnd.google-apps.folder",
        },
        { id: "2", name: "File.txt", mimeType: "text/plain" },
      ];

      (fetchWithRetry as any).mockResolvedValue({
        ok: true,
        json: async () => ({ files: mockFiles, nextPageToken: "token123" }),
      });

      const result = await listFilesFromDrive("folder-id");

      expect(result.files).toHaveLength(2);
      expect(result.files[0].isFolder).toBe(true);
      expect(result.files[1].isFolder).toBe(false);
      expect(result.nextPageToken).toBe("token123");
    });

    it("throws error on API failure", async () => {
      (fetchWithRetry as any).mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "Not Found" } }),
      });

      await expect(listFilesFromDrive("bad-id")).rejects.toThrow("Not Found");
    });
  });
});
