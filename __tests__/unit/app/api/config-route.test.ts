import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetPublicAppConfig } = vi.hoisted(() => ({
  mockGetPublicAppConfig: vi.fn(),
}));

vi.mock("@/lib/app-config", () => ({
  getPublicAppConfig: mockGetPublicAppConfig,
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn().mockReturnValue({ headers: new Headers() }),
}));

import { GET } from "@/app/api/config/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/config");
}

describe("app/api/config route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public app config", async () => {
    mockGetPublicAppConfig.mockResolvedValue({
      appName: "Zee Index",
      disableGuestLogin: false,
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      appName: "Zee Index",
      disableGuestLogin: false,
    });
  });

  it("returns 500 when config fetch fails", async () => {
    mockGetPublicAppConfig.mockRejectedValue(new Error("db unavailable"));

    const response = await GET(makeRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to fetch public config",
    });
  });
});
