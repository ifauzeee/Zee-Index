import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockListSharedDrives, mockListSharedWithMeFolders } = vi.hoisted(
  () => ({
    mockListSharedDrives: vi.fn(),
    mockListSharedWithMeFolders: vi.fn(),
  }),
);

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("@/lib/drive", () => ({
  listSharedDrives: mockListSharedDrives,
  listSharedWithMeFolders: mockListSharedWithMeFolders,
}));

import { GET } from "@/app/api/admin/drives/scan/route";

describe("app/api/admin/drives/scan GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSharedDrives.mockResolvedValue([
      { id: "drive1", name: "Team Drive 1" },
    ]);
    mockListSharedWithMeFolders.mockResolvedValue([
      {
        id: "folder1",
        name: "Shared Folder 1",
        owners: [{ displayName: "Owner A" }],
      },
    ]);
  });

  it("returns combined team drives and shared folders", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/drives/scan"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([
      { id: "drive1", name: "Team Drive 1", kind: "teamDrive" },
      {
        id: "folder1",
        name: "Shared Folder 1",
        kind: "sharedFolder",
        owner: "Owner A",
      },
    ]);
  });

  it("handles empty results", async () => {
    mockListSharedDrives.mockResolvedValue([]);
    mockListSharedWithMeFolders.mockResolvedValue([]);
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/drives/scan"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  it("returns 500 on error", async () => {
    mockListSharedDrives.mockRejectedValue(new Error("drive api error"));
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/drives/scan"),
    );
    expect(response.status).toBe(500);
  });
});
