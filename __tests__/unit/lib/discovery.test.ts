import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    fileIndex: { findMany: vi.fn() },
    activityLog: { groupBy: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

import {
  filterAccessibleDiscovery,
  getRecentlyAdded,
  getTopDownloads,
  resolveBlockedIds,
} from "@/lib/discovery";

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

describe("filterAccessibleDiscovery", () => {
  const recent = [
    {
      id: "a",
      name: "a.mp4",
      mimeType: "video/mp4",
      folderId: "open",
      modifiedTime: new Date(),
    },
    {
      id: "b",
      name: "b.mp4",
      mimeType: "video/mp4",
      folderId: "sub-of-locked",
      modifiedTime: new Date(),
    },
    {
      id: "c",
      name: "c.mp4",
      mimeType: "video/mp4",
      folderId: "secret",
      modifiedTime: new Date(),
    },
  ];
  const top = [
    {
      itemId: "x",
      itemName: "x.mp4",
      itemType: "video/mp4",
      folderId: "open",
      count: 5,
    },
    {
      itemId: "y",
      itemName: "y.mp4",
      itemType: "video/mp4",
      folderId: "sub-of-locked",
      count: 9,
    },
    {
      itemId: "z",
      itemName: "z.mp4",
      itemType: "video/mp4",
      folderId: null,
      count: 2,
    },
  ];

  it("drops flagged items and unresolved download links", () => {
    const result = filterAccessibleDiscovery(
      recent,
      top,
      new Set(["b", "c", "y"]),
      false,
      10,
    );
    expect(result.recent.map((f) => f.id)).toEqual(["a"]);
    expect(result.top.map((f) => f.itemId)).toEqual(["x"]);
  });

  it("caps results after filtering so blocked items leave no gaps", () => {
    const files = Array.from({ length: 12 }, (_, index) => ({
      id: `f${index}`,
      name: `f${index}.mp4`,
      mimeType: "video/mp4",
      folderId: "open",
      modifiedTime: new Date(),
    }));

    const result = filterAccessibleDiscovery(
      files,
      [],
      new Set(["f0", "f1"]),
      false,
      5,
    );

    expect(result.recent.map((f) => f.id)).toEqual([
      "f2",
      "f3",
      "f4",
      "f5",
      "f6",
    ]);
  });

  it("returns nothing for a guest session", () => {
    const result = filterAccessibleDiscovery(recent, top, new Set(), true, 10);
    expect(result.recent).toEqual([]);
    expect(result.top).toEqual([]);
  });
});

describe("resolveBlockedIds", () => {
  it("dedupes ids and returns only restricted ones", async () => {
    const isRestricted = vi.fn(async (id: string) => id === "b");

    const blocked = await resolveBlockedIds(["a", "a", "b", "c"], isRestricted);

    expect(Array.from(blocked)).toEqual(["b"]);
    expect(isRestricted).toHaveBeenCalledTimes(3);
  });
});
