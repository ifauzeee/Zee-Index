import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetPublicAppConfig } = vi.hoisted(() => ({
  mockGetPublicAppConfig: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (ctx: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("@/lib/app-config", () => ({
  getPublicAppConfig: mockGetPublicAppConfig,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET } from "@/app/api/config/public/route";

describe("app/api/config/public route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public app config", async () => {
    mockGetPublicAppConfig.mockResolvedValue({
      appName: "Zee Index",
      disableGuestLogin: false,
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/config/public"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      appName: "Zee Index",
      disableGuestLogin: false,
    });
  });

  it("returns 500 when config fetch fails", async () => {
    mockGetPublicAppConfig.mockRejectedValue(new Error("db down"));

    const response = await GET(
      new NextRequest("http://localhost:3000/api/config/public"),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to fetch configuration.",
    });
  });
});
