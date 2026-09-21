import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    fileIndex: { findMany: vi.fn() },
    activityLog: { groupBy: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { getRecentlyAdded, getTopDownloads } from "@/lib/discovery";

describe("lib/discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns recently added files ordered by modifiedTime desc", async () => {
    const files = [
      { id: "a", name: "a.mp4", mimeType: "video/mp4", folderId: "f1" },
      { id: "b", name: "b.pdf", mimeType: "application/pdf", folderId: "f2" },
    ];
    mockDb.fileIndex.findMany.mockResolvedValue(files);

    const result = await getRecentlyAdded(10);

    expect(result).toEqual(files);
    expect(mockDb.fileIndex.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { modifiedTime: "desc" },
        take: 10,
      }),
    );
  });

  it("returns top downloads grouped by file with folder resolution", async () => {
    mockDb.activityLog.groupBy.mockResolvedValue([
      {
        itemId: "f1",
        itemName: "hot.mp4",
        itemType: "video/mp4",
        _count: { _all: 12 },
      },
      {
        itemId: "f2",
        itemName: "other.txt",
        itemType: null,
        _count: { _all: 3 },
      },
    ]);
    mockDb.fileIndex.findMany.mockResolvedValue([
      { id: "f1", folderId: "folder-1" },
      { id: "f2", folderId: "folder-2" },
    ]);

    const result = await getTopDownloads(10);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      itemId: "f1",
      itemName: "hot.mp4",
      itemType: "video/mp4",
      folderId: "folder-1",
      count: 12,
    });
    expect(mockDb.activityLog.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "file:download" }),
      }),
    );
  });
});
