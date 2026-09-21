import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSpies, mockStorage } = vi.hoisted(() => {
  const mockSpies = {
    append: vi.fn().mockReturnThis(),
    finalize: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockReturnThis(),
  };
  return {
    mockSpies,
    mockStorage: {
      listAllFiles: vi.fn(),
      getDownloadStream: vi.fn(),
    },
  };
});

vi.mock("archiver", () => {
  class ZipArchive {}
  Object.assign(ZipArchive.prototype, mockSpies);
  return { ZipArchive };
});
vi.mock("@/lib/storage", () => mockStorage);

import { createFolderZipStream, FolderZipError } from "@/lib/zip";

const emptyWebStream = () =>
  new ReadableStream({
    start(controller) {
      controller.close();
    },
  });

function makeFiles(count: number, sizeBytes = 10) {
  return Array.from({ length: count }, (_, i) => ({
    id: `f${i}`,
    name: `file-${i}.txt`,
    mimeType: "text/plain",
    size: String(sizeBytes),
    isFolder: false,
  }));
}

describe("lib/zip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.getDownloadStream.mockImplementation(() =>
      Promise.resolve({ stream: emptyWebStream() }),
    );
  });

  it("throws when the folder has no files", async () => {
    mockStorage.listAllFiles.mockResolvedValue({
      files: [],
      nextPageToken: null,
    });
    await expect(createFolderZipStream("folder-1")).rejects.toThrow(
      FolderZipError,
    );
  });

  it("throws when the folder exceeds the file count limit", async () => {
    mockStorage.listAllFiles.mockResolvedValue({
      files: makeFiles(201),
      nextPageToken: null,
    });
    await expect(createFolderZipStream("folder-1")).rejects.toThrow(
      "Too many files",
    );
  });

  it("throws when the total size exceeds the byte limit", async () => {
    mockStorage.listAllFiles.mockResolvedValue({
      // 600 MB each * 2 > 1 GB limit
      files: makeFiles(2, 600 * 1024 * 1024),
      nextPageToken: null,
    });
    await expect(createFolderZipStream("folder-1")).rejects.toThrow(
      "Total size too large",
    );
  });

  it("appends each file stream to the zip and finalizes", async () => {
    mockStorage.listAllFiles.mockResolvedValue({
      files: makeFiles(2),
      nextPageToken: null,
    });

    const { stream, stats } = await createFolderZipStream("folder-1");

    expect(stream).toBeDefined();
    expect(mockSpies.append).toHaveBeenCalledTimes(2);
    expect(mockSpies.append).toHaveBeenCalledWith(expect.anything(), {
      name: "file-0.txt",
    });
    expect(mockSpies.finalize).toHaveBeenCalled();
    expect(stats).toEqual({ files: 2, totalBytes: 20 });
  });
});
