import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockKvGet } = vi.hoisted(() => ({
  mockKvGet: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
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
      return handler({ request, body });
    };
  },
}));

vi.mock("@/lib/kv", () => ({
  kv: { get: mockKvGet },
}));

vi.mock("jose", () => ({
  jwtVerify: vi.fn().mockResolvedValue({
    payload: { jti: "test-jti", exp: Math.floor(Date.now() / 1000) + 3600 },
  }),
}));

process.env.SHARE_SECRET_KEY = "test-secret-key-at-least-32-chars-long!";

import { POST } from "@/app/api/share/status/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/share/status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("app/api/share/status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvGet.mockResolvedValue(null);
  });

  it("returns valid for active share token", async () => {
    const response = await POST(makeRequest({ shareToken: "valid-token" }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.valid).toBe(true);
  });

  it("returns invalid for blocked share token", async () => {
    mockKvGet.mockResolvedValue("blocked");

    const response = await POST(makeRequest({ shareToken: "blocked-token" }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.valid).toBe(false);
  });

  it("returns invalid for expired/invalid token", async () => {
    const { jwtVerify } = await import("jose");
    (jwtVerify as any).mockRejectedValueOnce(new Error("Token expired"));

    const response = await POST(makeRequest({ shareToken: "expired" }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.valid).toBe(false);
  });
});
