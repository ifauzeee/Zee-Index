import { describe, it, expect, beforeEach, vi } from "vitest";

describe("storage mime helper", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("maps known extensions to mime types", async () => {
    const { getMimeType } = await import("@/lib/storage/mime");
    expect(getMimeType("photo.JPG")).toBe("image/jpeg");
    expect(getMimeType("doc.pdf")).toBe("application/pdf");
    expect(getMimeType("movie.MP4")).toBe("video/mp4");
  });

  it("returns undefined for unknown extensions", async () => {
    const { getMimeType } = await import("@/lib/storage/mime");
    expect(getMimeType("file.unknownext")).toBeUndefined();
    expect(getMimeType("noextension")).toBeUndefined();
  });

  it("detects folder mime", async () => {
    const { isFolderMime } = await import("@/lib/storage/mime");
    expect(isFolderMime("application/vnd.google-apps.folder")).toBe(true);
    expect(isFolderMime("image/png")).toBe(false);
    expect(isFolderMime(null)).toBe(false);
  });
});
