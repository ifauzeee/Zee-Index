import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockStat } = vi.hoisted(() => ({ mockStat: vi.fn() }));

vi.mock("webdav", () => ({
  createClient: () => ({ stat: mockStat }),
}));

import { WebDavStorageProvider } from "@/lib/storage/providers/webdav";

describe("WebDavStorageProvider paths (Z2-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STORAGE_WEBDAV_URL = "https://dav.example.com";
    process.env.STORAGE_WEBDAV_BASEPATH = "/shared";
    mockStat.mockResolvedValue({
      filename: "/shared/docs/a.pdf",
      basename: "a.pdf",
      type: "file",
      size: 1,
      lastmod: "",
    });
  });

  it("maps ids below basePath", async () => {
    await new WebDavStorageProvider().getFileDetails("webdav:docs/a.pdf");

    expect(mockStat).toHaveBeenCalledWith("/shared/docs/a.pdf", {
      details: true,
    });
  });

  it("resolves .. inside basePath before calling the server", async () => {
    await new WebDavStorageProvider().getFileDetails(
      "webdav:docs/../other/a.pdf",
    );

    expect(mockStat).toHaveBeenCalledWith("/shared/other/a.pdf", {
      details: true,
    });
  });

  it("never sends a path that climbs out of basePath", async () => {
    await expect(
      new WebDavStorageProvider().getFileDetails("webdav:../../etc/passwd"),
    ).rejects.toThrow("Invalid WebDAV path");
    expect(mockStat).not.toHaveBeenCalled();
  });
});
