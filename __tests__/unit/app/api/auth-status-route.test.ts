import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockCheckGoogleDriveHealth } = vi.hoisted(() => ({
  mockCheckGoogleDriveHealth: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async () => handler({});
  },
}));

vi.mock("@/lib/services/health-service", () => ({
  checkGoogleDriveHealth: mockCheckGoogleDriveHealth,
}));

import { GET } from "@/app/api/auth/status/route";

describe("app/api/auth/status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns healthy status", async () => {
    mockCheckGoogleDriveHealth.mockResolvedValue({
      status: "healthy",
      error: null,
    });

    const response = await GET(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("healthy");
  });

  it("returns unhealthy status", async () => {
    mockCheckGoogleDriveHealth.mockResolvedValue({
      status: "unhealthy",
      error: "Drive API error",
    });

    const response = await GET(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("unhealthy");
    expect(data.error).toBe("Drive API error");
  });

  it("returns 500 when health check throws", async () => {
    mockCheckGoogleDriveHealth.mockRejectedValue(
      new Error("Health check failed"),
    );

    const response = await GET(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.status).toBe("unhealthy");
  });
});
