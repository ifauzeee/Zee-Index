import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockAuthenticator,
  mockGetTwoFactorState,
  mockKvSet,
  mockGetToken,
  mockCheckRateLimit,
} = vi.hoisted(() => ({
  mockAuthenticator: { check: vi.fn() },
  mockGetTwoFactorState: vi.fn(),
  mockKvSet: vi.fn(),
  mockGetToken: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createUserRoute: (
    handler: (ctx: any) => Promise<Response>,
    options?: { bodySchema?: { safeParse: (v: unknown) => any } },
  ) => {
    return async (request: NextRequest) => {
      let body = {};
      if (options?.bodySchema) {
        const raw = await request.json();
        const parsed = options.bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }
        body = parsed.data;
      }
      return handler({
        request,
        body,
        session: { user: { email: "user@test.com" } },
      });
    };
  },
}));

// Single-use enforcement is covered in totp.test.ts; here only the result matters.
vi.mock("@/lib/totp", () => ({
  verifyTotpOnce: async (_email: string, token: string, secret: string) =>
    mockAuthenticator.check(token, secret),
}));

vi.mock("@/lib/kv", () => ({
  kv: { set: mockKvSet },
}));

vi.mock("@/lib/credentials", () => ({
  getTwoFactorState: mockGetTwoFactorState,
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("next-auth/jwt", () => ({
  getToken: mockGetToken,
}));

import { POST } from "@/app/api/auth/2fa/verify-login/route";

describe("app/api/auth/2fa/verify-login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockGetToken.mockResolvedValue({
      twoFactorRequired: true,
      sessionId: "test-session-id",
    });
    mockGetTwoFactorState.mockResolvedValue({
      enabled: true,
      secret: "stored-2fa-secret",
    });
    mockAuthenticator.check.mockReturnValue(true);
    mockKvSet.mockResolvedValue("OK");
  });

  it("verifies 2FA during login", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "123456" }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockKvSet).toHaveBeenCalledWith("2fa_passed:test-session-id", true, {
      ex: 300,
    });
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false });

    const response = await POST(
      new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "123456" }),
      }),
    );

    expect(response.status).toBe(429);
  });

  it("returns 429 when the per-account 2FA limit is exceeded", async () => {
    mockCheckRateLimit.mockImplementation((_request, _type, identifier) =>
      Promise.resolve({
        success: !String(identifier).startsWith("2fa:"),
        limit: 10,
        remaining: 0,
        reset: 0,
      }),
    );

    const response = await POST(
      new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "123456" }),
      }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many requests. Please try again later.",
    });
    // The account budget must be spent before the code is checked.
    expect(mockAuthenticator.check).not.toHaveBeenCalled();
  });

  it("returns 400 when 2FA not required", async () => {
    mockGetToken.mockResolvedValue({
      twoFactorRequired: false,
      sessionId: "test-session-id",
    });

    const response = await POST(
      new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "123456" }),
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("tidak diperlukan");
  });

  it("returns 400 when no token", async () => {
    mockGetToken.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "123456" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when 2FA secret not found", async () => {
    mockGetTwoFactorState.mockResolvedValue({ enabled: false, secret: null });

    const response = await POST(
      new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "123456" }),
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("tidak ditemukan");
  });

  it("returns 400 when TOTP token is invalid", async () => {
    mockAuthenticator.check.mockReturnValue(false);

    const response = await POST(
      new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "000000" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mockGetToken.mockRejectedValue(new Error("JWT error"));

    const response = await POST(
      new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "123456" }),
      }),
    );

    expect(response.status).toBe(500);
  });
});
