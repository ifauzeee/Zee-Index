import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockKvGet } = vi.hoisted(() => ({
  mockKvGet: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createUserRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async () =>
      handler({
        session: { user: { email: "user@test.com" } },
      });
  },
}));

vi.mock("@/lib/kv", () => ({
  kv: { get: mockKvGet },
}));

import { GET } from "@/app/api/auth/2fa/status/route";

describe("app/api/auth/2fa/status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns enabled when 2fa:enabled key exists", async () => {
    mockKvGet.mockResolvedValue("true");

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.isEnabled).toBe(true);
  });

  it("returns disabled when 2fa:enabled key is null", async () => {
    mockKvGet.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.isEnabled).toBe(false);
  });

  it("returns 500 on kv error", async () => {
    mockKvGet.mockRejectedValue(new Error("KV error"));

    const response = await GET();

    expect(response.status).toBe(500);
  });
});
