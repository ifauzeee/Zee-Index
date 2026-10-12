import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listSharedDrives,
  listFilesFromDrive,
  getAllDescendantFolders,
  getFileDetailsFromDrive,
  getFolderPath,
  searchFilesInFolder,
} from "@/lib/drive";

vi.mock("@/lib/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue("OK"),
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
  describe("getAllDescendantFolders", () => {
    it("returns cached tree if available", async () => {
      const mockTree = ["root", "child1", "child2"];
      const { kv } = await import("@/lib/kv");
      (kv.get as any).mockResolvedValue(mockTree);

      const result = await getAllDescendantFolders("token", "root");
      expect(result).toEqual(mockTree);
      expect(fetchWithRetry).not.toHaveBeenCalled();
    });

    it("fetches from API if cache miss", async () => {
      const { kv } = await import("@/lib/kv");
      (kv.get as any).mockResolvedValue(null);

      (fetchWithRetry as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ id: "child1" }, { id: "child2" }],
        }),
      });

      (fetchWithRetry as any).mockResolvedValue({
        ok: true,
        json: async () => ({ files: [] }),
      });

      const result = await getAllDescendantFolders("token", "root");
      expect(result).toContain("root");
      expect(result).toContain("child1");
      expect(result).toContain("child2");
      expect(kv.set).toHaveBeenCalled();
    });

    it("handles pagination correctly", async () => {
      const { kv } = await import("@/lib/kv");
      (kv.get as any).mockResolvedValue(null);

      (fetchWithRetry as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ id: "child1" }],
          nextPageToken: "next-page",
        }),
      });

      (fetchWithRetry as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ id: "child2" }],
        }),
      });

      (fetchWithRetry as any).mockResolvedValue({
        ok: true,
        json: async () => ({ files: [] }),
      });

      const result = await getAllDescendantFolders("token", "root");
      expect(result).toContain("child1");
      expect(result).toContain("child2");
    });
  });

  describe("Drive id guard (Z2-05)", () => {
    const injected = "root' in parents or trashed=false or '";

    it("never sends a non-Drive id to the details endpoint", async () => {
      expect(await getFileDetailsFromDrive("abc/permissions")).toBeNull();
      expect(await getFileDetailsFromDrive(injected)).toBeNull();
      expect(fetchWithRetry).not.toHaveBeenCalled();
    });

    it("refuses to list or search with an id that would change the query", async () => {
      await expect(listFilesFromDrive(injected)).rejects.toThrow(
        "Invalid Drive id",
      );
      await expect(
        searchFilesInFolder("token", injected, "q", "name", "", ""),
      ).rejects.toThrow("Invalid Drive id");
      expect(fetchWithRetry).not.toHaveBeenCalled();
    });

    it("returns an empty path for a non-Drive id", async () => {
      expect(await getFolderPath(injected)).toEqual([]);
      expect(fetchWithRetry).not.toHaveBeenCalled();
    });
  });
});
