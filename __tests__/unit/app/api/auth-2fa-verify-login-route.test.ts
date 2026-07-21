import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockAuthenticator,
  mockKvGet,
  mockKvSet,
  mockGetToken,
  mockCheckRateLimit,
} = vi.hoisted(() => ({
  mockAuthenticator: { check: vi.fn() },
  mockKvGet: vi.fn(),
  mockKvSet: vi.fn(),
  mockGetToken: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

const mockBodySchema = {
  safeParse: vi.fn((v: unknown) => {
    const body = v as Record<string, unknown>;
    if (typeof body.token === "string" && body.token.length > 0) {
      return { success: true, data: body };
    }
    return { success: false, error: { message: "Token required" } };
  }),
};

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

vi.mock("otplib", () => ({
  authenticator: mockAuthenticator,
}));

vi.mock("@/lib/kv", () => ({
  kv: { get: mockKvGet, set: mockKvSet },
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
    mockKvGet.mockResolvedValue("stored-2fa-secret");
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
    mockKvGet.mockResolvedValue(null);

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
