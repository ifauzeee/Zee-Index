import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockKvSet } = vi.hoisted(() => ({
  mockKvSet: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
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
        session: { user: { email: "admin@test.com" } },
      });
    };
  },
}));

vi.mock("@/lib/kv", () => ({
  kv: { set: mockKvSet },
}));

import { POST } from "@/app/api/share/revoke/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/share/revoke", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("app/api/share/revoke route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvSet.mockResolvedValue("OK");
  });

  it("revokes a share link", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const response = await POST(
      makeRequest({ jti: "share-jti", expiresAt: futureDate }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockKvSet).toHaveBeenCalled();
  });

  it("returns success for already expired share", async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const response = await POST(
      makeRequest({ jti: "expired-jti", expiresAt: pastDate }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toContain("sudah kedaluwarsa");
    expect(mockKvSet).not.toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    mockKvSet.mockRejectedValue(new Error("KV error"));

    const response = await POST(
      makeRequest({
        jti: "share-jti",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    );

    expect(response.status).toBe(500);
  });
});
