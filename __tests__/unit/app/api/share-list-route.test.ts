import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockShareLinkFindMany } = vi.hoisted(() => ({
  mockShareLinkFindMany: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async () =>
      handler({
        session: { user: { email: "admin@test.com" } },
      });
  },
}));

vi.mock("@/lib/db", () => ({
  db: { shareLink: { findMany: mockShareLinkFindMany } },
}));

import { GET } from "@/app/api/share/list/route";

describe("app/api/share/list route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns share links list", async () => {
    mockShareLinkFindMany.mockResolvedValue([
      {
        id: "share-1",
        path: "/folder/file",
        token: "token-1",
        jti: "jti-1",
        expiresAt: new Date("2030-01-01"),
        loginRequired: false,
        itemName: "File 1",
        isCollection: false,
        maxUses: null,
        preventDownload: false,
        hasWatermark: false,
        watermarkText: null,
        views: 5,
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("share-1");
    expect(data[0].viewCount).toBe(5);
  });

  it("returns empty array when no shares", async () => {
    mockShareLinkFindMany.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    mockShareLinkFindMany.mockRejectedValue(new Error("DB error"));

    const response = await GET();

    expect(response.status).toBe(500);
  });
});
