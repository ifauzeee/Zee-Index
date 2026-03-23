import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAppConfig, mockUpdateAppConfig } = vi.hoisted(() => ({
  mockGetAppConfig: vi.fn(),
  mockUpdateAppConfig: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: {
      request: NextRequest;
      body?: Record<string, unknown>;
    }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => {
      const contentType = request.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? ((await request.json()) as Record<string, unknown>)
        : undefined;

      return handler({ request, body });
    };
  },
}));

vi.mock("@/lib/app-config", () => ({
  appConfigUpdateSchema: {},
  getAppConfig: mockGetAppConfig,
  updateAppConfig: mockUpdateAppConfig,
}));

import { GET, POST } from "@/app/api/admin/config/route";

describe("app/api/admin/config route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAppConfig.mockResolvedValue({
      hideAuthor: false,
      disableGuestLogin: false,
      appName: "Zee Index",
      logoUrl: "",
      faviconUrl: "",
      primaryColor: "",
    });
    mockUpdateAppConfig.mockResolvedValue({
      hideAuthor: false,
      disableGuestLogin: true,
      appName: "Zee Index",
      logoUrl: "https://example.com/logo.png",
      faviconUrl: "",
      primaryColor: "#112233",
    });
  });

  it("returns the normalized admin config payload", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/config"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      hideAuthor: false,
      disableGuestLogin: false,
      appName: "Zee Index",
      logoUrl: "",
      faviconUrl: "",
      primaryColor: "",
    });
  });

  it("persists partial updates as merged config", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          disableGuestLogin: true,
          primaryColor: "#112233",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockUpdateAppConfig).toHaveBeenCalledWith({
      disableGuestLogin: true,
      primaryColor: "#112233",
    });
    await expect(response.json()).resolves.toEqual({
      message: "Config updated",
      config: {
        hideAuthor: false,
        disableGuestLogin: true,
        appName: "Zee Index",
        logoUrl: "https://example.com/logo.png",
        faviconUrl: "",
        primaryColor: "#112233",
      },
    });
  });
});
