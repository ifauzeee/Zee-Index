import { describe, expect, it, vi } from "vitest";

// Incompressible payload larger than the archiver's internal high-water mark.
// A ZIP of this content cannot be buffered inside the transform, so it only
// completes when the caller actually consumes the stream.
const { SIZE } = vi.hoisted(() => ({ SIZE: 2 * 1024 * 1024 }));

vi.mock("@/lib/storage", () => ({
  listAllFiles: vi.fn(async () => ({
    files: [
      {
        id: "f1",
        name: "big.bin",
        mimeType: "application/octet-stream",
        size: String(SIZE),
        isFolder: false,
      },
    ],
    nextPageToken: null,
  })),
  getDownloadStream: vi.fn(async () => {
    const [{ Readable }, { randomBytes }] = await Promise.all([
      import("stream"),
      import("crypto"),
    ]);
    const payload = randomBytes(SIZE);
    return {
      stream: Readable.toWeb(Readable.from(payload)),
      size: payload.length,
      mimeType: "application/octet-stream",
      filename: "big.bin",
    };
  }),
}));

import { createFolderZipStream } from "@/lib/zip";

describe("createFolderZipStream streaming", () => {
  it("returns without pre-consuming the archive and drains to a complete zip", async () => {
    const { stream, stats } = await createFolderZipStream("folder-1");

    expect(stats.files).toBe(1);

    let bytes = 0;
    for await (const chunk of stream) {
      bytes += (chunk as Buffer).length;
    }

    // ZIP container of ~2 MB incompressible data is at least the payload size.
    expect(bytes).toBeGreaterThan(SIZE);
  }, 10000);
});
