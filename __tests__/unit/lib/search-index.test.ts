import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    fileIndex: {
      upsert: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  removeIndexedFile,
  searchIndexedFiles,
  upsertIndexedFile,
} from "@/lib/search-index";

describe("lib/search-index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.fileIndex.upsert.mockResolvedValue({});
    mockDb.fileIndex.delete.mockResolvedValue({});
    mockDb.fileIndex.findMany.mockResolvedValue([]);
  });

  it("upserts a file into the index", async () => {
    await upsertIndexedFile({
      id: "file-1",
      name: "report.pdf",
      mimeType: "application/pdf",
      folderId: "folder-1",
      source: "google-drive",
      modifiedTime: "2024-01-01T00:00:00Z",
      size: 1234,
    });
    expect(mockDb.fileIndex.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "file-1" },
        create: expect.objectContaining({ name: "report.pdf", size: 1234 }),
      }),
    );
  });

  it("returns empty for blank query", async () => {
    const result = await searchIndexedFiles({ query: "   " });
    expect(result).toEqual([]);
    expect(mockDb.fileIndex.findMany).not.toHaveBeenCalled();
  });

  it("searches case-insensitively by name", async () => {
    mockDb.fileIndex.findMany.mockResolvedValue([
      {
        id: "f1",
        name: "Quarterly Report.pdf",
        mimeType: "application/pdf",
        folderId: "x",
        source: "google-drive",
        size: 1,
        modifiedTime: new Date(),
      },
    ]);
    const result = await searchIndexedFiles({ query: "quarterly" });
    expect(result).toHaveLength(1);
    const where = mockDb.fileIndex.findMany.mock.calls[0][0].where;
    expect(where.name).toEqual({ contains: "quarterly", mode: "insensitive" });
  });

  it("maps mimeType filters", async () => {
    mockDb.fileIndex.findMany.mockResolvedValue([]);
    await searchIndexedFiles({ query: "a", mimeType: "image" });
    const where = mockDb.fileIndex.findMany.mock.calls[0][0].where;
    expect(where.mimeType).toEqual({ contains: "image/" });

    await searchIndexedFiles({ query: "a", mimeType: "folder" });
    const where2 = mockDb.fileIndex.findMany.mock.calls[1][0].where;
    expect(where2.mimeType).toEqual("application/vnd.google-apps.folder");
  });

  it("deletes an indexed file", async () => {
    await removeIndexedFile("file-1");
    expect(mockDb.fileIndex.delete).toHaveBeenCalledWith({
      where: { id: "file-1" },
    });
  });

  it("returns empty and swallows errors on DB failure", async () => {
    mockDb.fileIndex.findMany.mockRejectedValue(new Error("db down"));
    const result = await searchIndexedFiles({ query: "x" });
    expect(result).toEqual([]);
  });
});
