import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetStorageDetails } = vi.hoisted(() => ({
  mockGetStorageDetails: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (ctx: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("@/lib/drive", () => ({
  getStorageDetails: mockGetStorageDetails,
}));

import { GET } from "@/app/api/datausage/route";

describe("app/api/datausage route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns total usage", async () => {
    mockGetStorageDetails.mockResolvedValue({ usage: 1_073_741_824 });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/datausage"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      totalUsage: 1_073_741_824,
    });
  });

  it("returns 500 when fetch fails", async () => {
    mockGetStorageDetails.mockRejectedValue(new Error("api error"));

    const response = await GET(
      new NextRequest("http://localhost:3000/api/datausage"),
    );

    expect(response.status).toBe(500);
  });
});
