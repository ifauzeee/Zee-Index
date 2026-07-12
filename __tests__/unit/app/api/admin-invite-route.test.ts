import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockUpsertUser } = vi.hoisted(() => ({
  mockUpsertUser: vi.fn(),
}));

type RouteHandler = (ctx: {
  body?: unknown;
  request: NextRequest;
}) => Promise<Response>;

vi.mock("@/lib/user-management", () => ({
  upsertUser: mockUpsertUser,
}));

const handlers = vi.hoisted(() => ({
  POST: undefined as unknown as RouteHandler,
}));
vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (handler: RouteHandler) => {
    handlers.POST = handler;
    return async (request: NextRequest) => {
      const raw = await request.json().catch(() => undefined);
      const parsed = (
        await import("@/app/api/admin/invite/route")
      ).inviteSchema.safeParse(raw);
      if (!parsed.success) {
        return new NextResponse(JSON.stringify({ error: "invalid" }), {
          status: 400,
        });
      }
      return handler({ body: parsed.data, request });
    };
  },
}));

import { POST } from "@/app/api/admin/invite/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/invite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("app/api/admin/invite route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertUser.mockResolvedValue({ email: "u@e.com", role: "USER" });
  });

  it("rejects an invalid email with 400", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it("invites a user with normalized email, role and password", async () => {
    const res = await POST(
      makeRequest({
        email: "New@Example.com",
        role: "EDITOR",
        password: "secret123",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockUpsertUser).toHaveBeenCalledWith(
      "new@example.com",
      "EDITOR",
      "secret123",
    );
  });

  it("defaults role to USER when omitted", async () => {
    await POST(makeRequest({ email: "plain@example.com" }));
    expect(mockUpsertUser).toHaveBeenCalledWith(
      "plain@example.com",
      "USER",
      undefined,
    );
  });

  it("returns 500 when upsert fails", async () => {
    mockUpsertUser.mockRejectedValue(new Error("db down"));
    const res = await POST(makeRequest({ email: "x@example.com" }));
    expect(res.status).toBe(500);
  });
});
