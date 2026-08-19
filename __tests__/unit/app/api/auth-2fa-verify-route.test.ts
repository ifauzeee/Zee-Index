import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockAuthenticator,
  mockKvGet,
  mockKvSet,
  mockKvDel,
  mockCheckRateLimit,
} = vi.hoisted(() => ({
  mockAuthenticator: { check: vi.fn() },
  mockKvGet: vi.fn(),
  mockKvSet: vi.fn(),
  mockKvDel: vi.fn(),
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

vi.mock("otplib", () => ({
  authenticator: mockAuthenticator,
}));

vi.mock("@/lib/kv", () => ({
  kv: { get: mockKvGet, set: mockKvSet, del: mockKvDel },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

import { POST } from "@/app/api/auth/2fa/verify/route";

describe("app/api/auth/2fa/verify route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockKvGet.mockResolvedValue("stored-secret");
    mockAuthenticator.check.mockReturnValue(true);
    mockKvSet.mockResolvedValue("OK");
    mockKvDel.mockResolvedValue(1);
  });

  it("verifies 2FA token successfully", async () => {
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
    expect(mockKvSet).toHaveBeenCalledWith(
      "2fa:secret:user@test.com",
      "stored-secret",
    );
    expect(mockKvSet).toHaveBeenCalledWith("2fa:enabled:user@test.com", true);
    expect(mockKvDel).toHaveBeenCalledWith("2fa:secret:temp:user@test.com");
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

  it("returns 400 when temp secret expired", async () => {
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
    expect(data.error).toContain("kedaluwarsa");
  });

  it("returns 400 when token is invalid", async () => {
    mockAuthenticator.check.mockReturnValue(false);

    const response = await POST(
      new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "000000" }),
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("tidak valid");
  });

  it("returns 400 on missing body", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mockKvGet.mockRejectedValue(new Error("KV error"));

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
