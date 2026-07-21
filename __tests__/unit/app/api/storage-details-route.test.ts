import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetStorageDetails, mockIsAccessRestricted } = vi.hoisted(() => ({
  mockGetStorageDetails: vi.fn(),
  mockIsAccessRestricted: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createUserRoute: (
    handler: (ctx: {
      request: NextRequest;
      session: { user: { email: string; role: string } };
    }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) =>
      handler({
        request,
        session: { user: { email: "user@example.com", role: "USER" } },
      });
  },
}));

vi.mock("@/lib/drive", () => ({
  getStorageDetails: mockGetStorageDetails,
}));

vi.mock("@/lib/securityUtils", () => ({
  isAccessRestricted: mockIsAccessRestricted,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET } from "@/app/api/storage-details/route";

describe("app/api/storage-details route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDetails = {
    usage: 1_073_741_824,
    limit: 15 * 1_073_741_824,
    files: 150,
    folders: 25,
    largestFiles: [
      { id: "file-1", name: "big.mp4", size: 500_000_000 },
      { id: "file-2", name: "restricted.mkv", size: 300_000_000 },
    ],
  };

  it("returns storage details for user (filters restricted files)", async () => {
    mockGetStorageDetails.mockResolvedValue({ ...mockDetails });
    mockIsAccessRestricted.mockImplementation((id: string) => id === "file-2");

    const response = await GET(
      new NextRequest("http://localhost:3000/api/storage-details"),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.usage).toBe(1_073_741_824);
    expect(json.largestFiles).toHaveLength(1);
    expect(json.largestFiles[0].id).toBe("file-1");
  });

  it("shows all files when no restrictions match", async () => {
    mockGetStorageDetails.mockResolvedValue({ ...mockDetails });
    mockIsAccessRestricted.mockResolvedValue(false);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/storage-details"),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.largestFiles).toHaveLength(2);
  });

  it("returns 500 on error", async () => {
    mockGetStorageDetails.mockRejectedValue(new Error("api down"));

    const response = await GET(
      new NextRequest("http://localhost:3000/api/storage-details"),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Gagal mengambil detail penyimpanan.",
      details: "api down",
    });
  });
});
