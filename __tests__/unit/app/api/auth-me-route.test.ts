import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (ctx: {
      request: NextRequest;
      session?: { user?: { email?: string; role?: string } } | null;
    }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) =>
      handler({
        request,
        session: { user: { email: "user@example.com", role: "USER" } },
      });
  },
}));

import { GET } from "@/app/api/auth/me/route";

describe("app/api/auth/me route", () => {
  it("returns the authenticated user", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/auth/me"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: { email: "user@example.com", role: "USER" },
    });
  });
});
