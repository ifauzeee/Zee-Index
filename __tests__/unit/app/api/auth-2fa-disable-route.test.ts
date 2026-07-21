import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockKvDel, mockCheckRateLimit } = vi.hoisted(() => ({
  mockKvDel: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createUserRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async (request: Request) =>
      handler({
        request,
        session: { user: { email: "user@test.com" } },
      });
  },
}));

vi.mock("@/lib/kv", () => ({
  kv: { del: mockKvDel },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

import { POST } from "@/app/api/auth/2fa/disable/route";

describe("app/api/auth/2fa/disable route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockKvDel.mockResolvedValue(1);
  });

  it("disables 2FA successfully", async () => {
    const response = await POST(new Request("http://localhost:3000"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockKvDel).toHaveBeenCalledWith("2fa:secret:user@test.com");
    expect(mockKvDel).toHaveBeenCalledWith("2fa:enabled:user@test.com");
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false });

    const response = await POST(new Request("http://localhost:3000"));

    expect(response.status).toBe(429);
  });

  it("returns 500 on kv error", async () => {
    mockKvDel.mockRejectedValue(new Error("KV error"));

    const response = await POST(new Request("http://localhost:3000"));

    expect(response.status).toBe(500);
  });
});
