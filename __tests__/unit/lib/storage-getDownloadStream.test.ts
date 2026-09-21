import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const { mockDrive, mockDownload } = vi.hoisted(() => ({
  mockDrive: {
    getAccessToken: vi.fn().mockResolvedValue("tok_123"),
    getFileDetailsFromDrive: vi.fn(),
  },
  mockDownload: {
    prepareGoogleDriveUrl: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/storage/providers", () => ({
  getActiveProvider: () => null,
  isProviderId: () => false,
}));
vi.mock("@/lib/drive", () => mockDrive);
vi.mock("@/lib/services/download", () => mockDownload);

import { getDownloadStream } from "@/lib/storage";

describe("getDownloadStream Drive branch", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_ENABLE_LOCAL_STORAGE = "false";
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("streams file from Google Drive", async () => {
    const rs = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array([1, 2, 3]));
        c.close();
      },
    });

    mockDrive.getFileDetailsFromDrive.mockResolvedValue({
      id: "drive1",
      mimeType: "video/mp4",
      name: "video.mp4",
      size: "500000",
    });
    mockDownload.prepareGoogleDriveUrl.mockReturnValue({
      url: "https://drive/dl",
      mimeType: "video/mp4",
      filename: "video.mp4",
    });

    // mock global fetch for this call
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(rs, { status: 200 }));

    const result = await getDownloadStream("drive1");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://drive/dl",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer tok_123",
        }),
      }),
    );
    expect(result).toMatchObject({
      size: 500000,
      mimeType: "video/mp4",
      filename: "video.mp4",
    });

    fetchSpy.mockRestore();
  });

  it("returns null for Google Drive folders", async () => {
    mockDrive.getFileDetailsFromDrive.mockResolvedValue({
      id: "folder",
      mimeType: "application/vnd.google-apps.folder",
      name: "Docs",
    });
    expect(await getDownloadStream("folder")).toBeNull();
  });
});
