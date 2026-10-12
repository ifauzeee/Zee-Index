import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetTwoFactorState } = vi.hoisted(() => ({
  mockGetTwoFactorState: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createUserRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async () =>
      handler({
        session: { user: { email: "user@test.com" } },
      });
  },
}));

vi.mock("@/lib/credentials", () => ({
  getTwoFactorState: mockGetTwoFactorState,
}));

import { GET } from "@/app/api/auth/2fa/status/route";

describe("app/api/auth/2fa/status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns enabled when the user has 2FA on", async () => {
    mockGetTwoFactorState.mockResolvedValue({ enabled: true, secret: "S" });

    const response = await GET(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.isEnabled).toBe(true);
  });

  it("returns disabled when the user has no 2FA", async () => {
    mockGetTwoFactorState.mockResolvedValue({ enabled: false, secret: null });

    const response = await GET(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.isEnabled).toBe(false);
  });

  it("returns 500 when the credential store fails", async () => {
    mockGetTwoFactorState.mockRejectedValue(new Error("DB error"));

    const response = await GET(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(500);
  });
});
