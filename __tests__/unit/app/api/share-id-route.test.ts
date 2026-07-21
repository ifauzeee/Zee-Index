import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockShareLinkFindUnique, mockShareLinkUpdate, mockKvSet, mockKvDel } =
  vi.hoisted(() => ({
    mockShareLinkFindUnique: vi.fn(),
    mockShareLinkUpdate: vi.fn(),
    mockKvSet: vi.fn(),
    mockKvDel: vi.fn(),
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
        params: { id: "test-share-id" },
        session: { user: { email: "admin@test.com" } },
      });
    };
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    shareLink: {
      findUnique: mockShareLinkFindUnique,
      update: mockShareLinkUpdate,
    },
  },
}));

vi.mock("@/lib/kv", () => ({
  kv: { set: mockKvSet, del: mockKvDel },
}));

import { PATCH } from "@/app/api/share/[id]/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/share/test-share-id", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("app/api/share/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShareLinkFindUnique.mockResolvedValue({
      id: "test-share-id",
      path: "/folder/file",
      token: "token",
      jti: "test-jti",
      expiresAt: new Date("2030-01-01"),
      loginRequired: false,
      itemName: "Test File",
      isCollection: false,
      maxUses: null,
      preventDownload: false,
      hasWatermark: false,
      watermarkText: null,
    });
    mockShareLinkUpdate.mockResolvedValue({
      id: "test-share-id",
      path: "/folder/file",
      token: "token",
      jti: "test-jti",
      expiresAt: new Date("2030-01-01"),
      loginRequired: true,
      itemName: "Test File",
      isCollection: false,
      maxUses: 10,
      preventDownload: true,
      hasWatermark: false,
      watermarkText: null,
    });
    mockKvSet.mockResolvedValue("OK");
  });

  it("updates share link settings", async () => {
    const response = await PATCH(
      makeRequest({
        loginRequired: true,
        maxUses: 10,
        preventDownload: true,
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.updatedShareLink.loginRequired).toBe(true);
    expect(mockKvSet).toHaveBeenCalled();
  });

  it("returns 404 when share not found", async () => {
    mockShareLinkFindUnique.mockResolvedValue(null);

    const response = await PATCH(makeRequest({ loginRequired: true }));

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain("tidak ditemukan");
  });

  it("cleans up Redis when share is expired", async () => {
    mockShareLinkUpdate.mockResolvedValue({
      id: "test-share-id",
      path: "/folder/file",
      token: "token",
      jti: "test-jti",
      expiresAt: new Date(Date.now() - 86400000),
      loginRequired: false,
      itemName: "Test File",
      isCollection: false,
      maxUses: null,
      preventDownload: false,
      hasWatermark: false,
      watermarkText: null,
    });

    const response = await PATCH(makeRequest({ loginRequired: false }));

    expect(response.status).toBe(200);
    // When expired, should delete from Redis instead of setting
    expect(mockKvDel).toHaveBeenCalledWith("share:link:test-jti");
  });

  it("returns 500 on error", async () => {
    mockShareLinkFindUnique.mockRejectedValue(new Error("DB error"));

    const response = await PATCH(makeRequest({ loginRequired: true }));

    expect(response.status).toBe(500);
  });
});
