import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockKv, mockDb } = vi.hoisted(() => ({
  mockKv: {
    hgetall: vi.fn(),
    hset: vi.fn().mockResolvedValue(1),
    hdel: vi.fn().mockResolvedValue(1),
    zadd: vi.fn().mockResolvedValue(1),
    zcard: vi.fn().mockResolvedValue(0),
    zrange: vi.fn().mockResolvedValue([]),
    zrem: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
  mockDb: {
    fileIndex: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/lib/kv", () => ({ kv: mockKv }));
vi.mock("@/lib/db", () => ({ db: mockDb }));

import {
  getWatchProgressList,
  upsertWatchProgress,
  MAX_WATCH_ITEMS,
} from "@/lib/watch-progress";

describe("lib/watch-progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKv.zcard.mockResolvedValue(0);
    mockKv.zrange.mockResolvedValue([]);
    mockDb.fileIndex.findMany.mockResolvedValue([]);
  });

  it("upserts a progress entry into hash, order set, and sets TTL", async () => {
    await upsertWatchProgress("User@Example.com", {
      fileId: "f1",
      fileName: "movie.mp4",
      position: 120,
      duration: 3600,
    });

    expect(mockKv.hset).toHaveBeenCalledWith(
      "watch:progress:user@example.com",
      expect.objectContaining({ f1: expect.any(String) }),
    );
    expect(mockKv.zadd).toHaveBeenCalledWith(
      "watch:progress:user@example.com:order",
      expect.objectContaining({ member: "f1" }),
    );
    expect(mockKv.expire).toHaveBeenCalledTimes(2);
  });

  it("prunes oldest entries beyond MAX_WATCH_ITEMS", async () => {
    mockKv.zcard.mockResolvedValue(MAX_WATCH_ITEMS + 2);
    mockKv.zrange
      .mockResolvedValueOnce(["keep1", "keep2"])
      .mockResolvedValueOnce(["old1", "old2", "keep1", "keep2"]);

    await upsertWatchProgress("a@b.com", {
      fileId: "new",
      fileName: "n.mp4",
      position: 10,
    });

    expect(mockKv.hdel).toHaveBeenCalledWith(
      "watch:progress:a@b.com",
      "old1",
      "old2",
    );
    expect(mockKv.zrem).toHaveBeenCalledWith(
      "watch:progress:a@b.com:order",
      "old1",
      "old2",
    );
  });

  it("lists only entries with position > 5 and hydrates file metadata", async () => {
    mockKv.hgetall.mockResolvedValue({
      f1: JSON.stringify({
        fileName: "watch.mp4",
        position: 100,
        duration: 1000,
        updatedAt: 1,
      }),
      f2: JSON.stringify({
        fileName: "done.mp4",
        position: 3,
        duration: 1000,
        updatedAt: 2,
      }),
    });
    mockKv.zrange.mockResolvedValue(["f1", "f2"]);
    mockDb.fileIndex.findMany.mockResolvedValue([
      { id: "f1", mimeType: "video/mp4", folderId: "folder-1" },
    ]);

    const list = await getWatchProgressList("a@b.com");

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      fileId: "f1",
      fileName: "watch.mp4",
      position: 100,
      mimeType: "video/mp4",
      folderId: "folder-1",
    });
  });

  it("returns empty list when no hash exists", async () => {
    mockKv.hgetall.mockResolvedValue(null);
    expect(await getWatchProgressList("none@b.com")).toEqual([]);
  });
});
