import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockChangeOwnPassword } = vi.hoisted(() => ({
  mockChangeOwnPassword: vi.fn(),
}));

type RouteHandler = (ctx: {
  body?: unknown;
  request: NextRequest;
  session: { user: { email: string } };
}) => Promise<Response>;

vi.mock("@/lib/user-management", () => ({
  changeOwnPassword: mockChangeOwnPassword,
}));

const handlers = vi.hoisted(() => ({
  POST: undefined as unknown as RouteHandler,
}));
vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (handler: RouteHandler) => {
    handlers.POST = handler;
    return async (request: NextRequest) => {
      const raw = await request.json().catch(() => undefined);
      const parsed = (
        await import("@/app/api/auth/profile/password/route")
      ).passwordSchema.safeParse(raw);
      if (!parsed.success) {
        return new NextResponse(JSON.stringify({ error: "invalid" }), {
          status: 400,
        });
      }
      return handler({
        body: parsed.data,
        request,
        session: { user: { email: "me@example.com" } },
      });
    };
  },
}));

import { POST } from "@/app/api/auth/profile/password/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/profile/password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("app/api/auth/profile/password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChangeOwnPassword.mockResolvedValue(undefined);
  });

  it("rejects a short new password with 400", async () => {
    const res = await POST(
      makeRequest({ currentPassword: "oldpass", newPassword: "123" }),
    );
    expect(res.status).toBe(400);
    expect(mockChangeOwnPassword).not.toHaveBeenCalled();
  });

  it("updates password for the authenticated user", async () => {
    const res = await POST(
      makeRequest({ currentPassword: "oldpass", newPassword: "newpass123" }),
    );
    expect(res.status).toBe(200);
    expect(mockChangeOwnPassword).toHaveBeenCalledWith(
      "me@example.com",
      "oldpass",
      "newpass123",
    );
  });

  it("rejects when current password is invalid", async () => {
    mockChangeOwnPassword.mockRejectedValue(
      new Error("CURRENT_PASSWORD_INVALID"),
    );
    const res = await POST(
      makeRequest({ currentPassword: "wrong", newPassword: "newpass123" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 on unexpected error", async () => {
    mockChangeOwnPassword.mockRejectedValue(new Error("boom"));
    const res = await POST(
      makeRequest({ currentPassword: "oldpass", newPassword: "newpass123" }),
    );
    expect(res.status).toBe(500);
  });
});
