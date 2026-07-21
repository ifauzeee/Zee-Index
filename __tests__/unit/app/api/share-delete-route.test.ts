import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockKvSet, mockKvDel, mockShareLinkDelete } = vi.hoisted(() => ({
  mockKvSet: vi.fn(),
  mockKvDel: vi.fn(),
  mockShareLinkDelete: vi.fn(),
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
  kv: { set: mockKvSet, del: mockKvDel },
}));

vi.mock("@/lib/db", () => ({
  db: { shareLink: { delete: mockShareLinkDelete } },
}));

import { POST } from "@/app/api/share/delete/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/share/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("app/api/share/delete route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvSet.mockResolvedValue("OK");
    mockKvDel.mockResolvedValue(1);
    mockShareLinkDelete.mockResolvedValue({ id: "share-id" });
  });

  it("deletes a share link", async () => {
    const response = await POST(
      makeRequest({
        id: "share-1",
        jti: "share-jti",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockKvSet).toHaveBeenCalled();
    expect(mockKvDel).toHaveBeenCalledWith("share:link:share-jti");
  });

  it("handles expired share gracefully", async () => {
    const response = await POST(
      makeRequest({
        id: "share-2",
        jti: "expired-jti",
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      }),
    );

    expect(response.status).toBe(200);
    // When already expired, expiresInSeconds <= 0, kv.set is not called
    expect(mockKvSet).not.toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    mockKvDel.mockRejectedValue(new Error("KV error"));

    const response = await POST(
      makeRequest({
        id: "share-3",
        jti: "share-jti",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    );

    expect(response.status).toBe(500);
  });
});
