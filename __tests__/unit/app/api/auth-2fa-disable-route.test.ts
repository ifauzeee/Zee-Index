import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetTwoFactorState,
  mockDisableTwoFactor,
  mockAuthenticatorCheck,
  routeOptions,
} = vi.hoisted(() => ({
  mockGetTwoFactorState: vi.fn(),
  mockDisableTwoFactor: vi.fn(),
  mockAuthenticatorCheck: vi.fn(),
  routeOptions: { current: undefined as unknown },
}));

vi.mock("@/lib/api-middleware", () => ({
  createUserRoute: (
    handler: (ctx: any) => Promise<Response>,
    options?: unknown,
  ) => {
    routeOptions.current = options;
    return async (request: NextRequest) =>
      handler({
        request,
        session: { user: { email: "user@test.com" } },
        body: { token: "123456" },
      });
  },
}));

vi.mock("@/lib/credentials", () => ({
  getTwoFactorState: mockGetTwoFactorState,
  disableTwoFactor: mockDisableTwoFactor,
}));

vi.mock("otplib", () => ({
  authenticator: { check: mockAuthenticatorCheck },
}));

import { POST } from "@/app/api/auth/2fa/disable/route";

describe("app/api/auth/2fa/disable route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTwoFactorState.mockResolvedValue({
      enabled: true,
      secret: "secret",
    });
    mockDisableTwoFactor.mockResolvedValue(undefined);
    mockAuthenticatorCheck.mockReturnValue(true);
  });

  it("disables 2FA with a valid code", async () => {
    const response = await POST(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockAuthenticatorCheck).toHaveBeenCalledWith("123456", "secret");
    expect(mockDisableTwoFactor).toHaveBeenCalledWith("user@test.com");
  });

  it("rejects an invalid code", async () => {
    mockAuthenticatorCheck.mockReturnValue(false);

    const response = await POST(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Kode verifikasi tidak valid.");
  });

  it("returns 400 when 2FA is not configured", async () => {
    mockGetTwoFactorState.mockResolvedValue({ enabled: false, secret: null });

    const response = await POST(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(400);
    expect(mockDisableTwoFactor).not.toHaveBeenCalled();
  });

  it("is rate limited once, by the route wrapper's AUTH tier", () => {
    expect(routeOptions.current).toMatchObject({ rateLimit: "AUTH" });
  });

  it("returns 500 when the credential store fails", async () => {
    mockGetTwoFactorState.mockRejectedValue(new Error("DB error"));

    const response = await POST(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(500);
  });
});
