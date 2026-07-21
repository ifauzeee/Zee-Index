import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockShareLinkUpdate } = vi.hoisted(() => ({
  mockShareLinkUpdate: vi.fn(),
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

vi.mock("@/lib/db", () => ({
  db: { shareLink: { update: mockShareLinkUpdate } },
}));

vi.mock("jose", () => ({
  jwtVerify: vi.fn().mockResolvedValue({
    payload: { jti: "test-jti" },
  }),
}));

process.env.SHARE_SECRET_KEY = "test-secret-key-at-least-32-chars-long!";

import { POST } from "@/app/api/share/track/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/share/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("app/api/share/track route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks a share view and returns 204", async () => {
    mockShareLinkUpdate.mockResolvedValue({ id: "test-jti" });

    const response = await POST(makeRequest({ shareToken: "valid-token" }));

    expect(response.status).toBe(204);
    expect(mockShareLinkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jti: "test-jti" },
        data: { views: { increment: 1 } },
      }),
    );
  });

  it("returns 204 even when DB update fails (fire-and-forget)", async () => {
    mockShareLinkUpdate.mockRejectedValue(new Error("DB error"));

    const response = await POST(makeRequest({ shareToken: "valid-token" }));

    expect(response.status).toBe(204);
  });

  it("returns 204 for invalid token", async () => {
    const { jwtVerify } = await import("jose");
    (jwtVerify as any).mockRejectedValueOnce(new Error("Bad token"));

    const response = await POST(makeRequest({ shareToken: "bad" }));

    expect(response.status).toBe(204);
  });
});
