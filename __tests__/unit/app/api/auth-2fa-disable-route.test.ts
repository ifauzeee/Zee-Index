import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockKvDel, mockKvGet, mockCheckRateLimit, mockAuthenticatorCheck } =
  vi.hoisted(() => ({
    mockKvDel: vi.fn(),
    mockKvGet: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockAuthenticatorCheck: vi.fn(),
  }));

vi.mock("@/lib/api-middleware", () => ({
  createUserRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async (request: NextRequest) =>
      handler({
        request,
        session: { user: { email: "user@test.com" } },
        body: { token: "123456" },
      });
  },
}));

vi.mock("@/lib/kv", () => ({
  kv: { get: mockKvGet, del: mockKvDel },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("otplib", () => ({
  authenticator: { check: mockAuthenticatorCheck },
}));

import { POST } from "@/app/api/auth/2fa/disable/route";

describe("app/api/auth/2fa/disable route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockKvGet.mockResolvedValue("secret");
    mockKvDel.mockResolvedValue(1);
    mockAuthenticatorCheck.mockReturnValue(true);
  });

  it("disables 2FA with a valid code", async () => {
    const response = await POST(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockAuthenticatorCheck).toHaveBeenCalledWith("123456", "secret");
    expect(mockKvDel).toHaveBeenCalledWith("2fa:secret:user@test.com");
    expect(mockKvDel).toHaveBeenCalledWith("2fa:enabled:user@test.com");
  });

  it("rejects an invalid code", async () => {
    mockAuthenticatorCheck.mockReturnValue(false);

    const response = await POST(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Kode verifikasi tidak valid.");
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false });

    const response = await POST(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(429);
  });

  it("returns 500 on kv error", async () => {
    mockKvGet.mockRejectedValue(new Error("KV error"));

    const response = await POST(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(500);
  });
});
