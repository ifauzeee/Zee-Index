import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockKvGet, mockShareLinkFindUnique } = vi.hoisted(() => ({
  mockKvGet: vi.fn(),
  mockShareLinkFindUnique: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (ctx: any) => Promise<Response>,
    options?: { includeSession?: boolean },
  ) => {
    return async (request: NextRequest) =>
      handler({
        request,
        params: { shareId: "test-collection" },
        session: { user: { email: "user@test.com", role: "USER" } },
      });
  },
}));

vi.mock("@/lib/kv", () => ({
  kv: { get: mockKvGet },
}));

vi.mock("@/lib/db", () => ({
  db: { shareLink: { findUnique: mockShareLinkFindUnique } },
}));

vi.mock("jose", () => ({
  jwtVerify: vi.fn().mockResolvedValue({
    payload: {
      jti: "test-collection",
      loginRequired: false,
    },
  }),
}));

process.env.SHARE_SECRET_KEY = "test-secret-key-at-least-32-chars-long!";

import { GET } from "@/app/api/share/items/[shareId]/route";

const mockFile = {
  id: "item-1",
  name: "File 1",
  mimeType: "text/plain",
  size: "1024",
  modifiedTime: "2025-01-01T00:00:00Z",
  createdTime: "2025-01-01T00:00:00Z",
  webViewLink: "https://drive.google.com/file/d/item-1",
  hasThumbnail: false,
  isFolder: false,
  trashed: false,
};

function makeRequest(url: string) {
  return new NextRequest(url);
}

describe("app/api/share/items/[shareId] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShareLinkFindUnique.mockResolvedValue({
      itemName: "Shared Collection",
    });
  });

  it("returns collection items for valid token", async () => {
    mockKvGet.mockResolvedValueOnce(null).mockResolvedValueOnce([mockFile]);

    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/share/items/test-collection?share_token=valid-token",
      ),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toHaveLength(1);
    expect(data.collectionName).toBe("Shared Collection");
  });

  it("returns 401 when share_token is missing", async () => {
    const response = await GET(
      makeRequest("http://localhost:3000/api/share/items/test-collection"),
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain("Token berbagi");
  });

  it("returns 403 when token is blocked", async () => {
    mockKvGet.mockReset();
    mockKvGet.mockResolvedValue("blocked");

    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/share/items/test-collection?share_token=valid-token",
      ),
    );

    expect(response.status).toBe(403);
  });

  it("returns 404 when collection not found", async () => {
    mockKvGet.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/share/items/test-collection?share_token=valid-token",
      ),
    );

    expect(response.status).toBe(404);
  });

  it("returns 401 on invalid token", async () => {
    const { jwtVerify } = await import("jose");
    (jwtVerify as any).mockRejectedValueOnce(new Error("Invalid token"));

    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/share/items/test-collection?share_token=bad-token",
      ),
    );

    expect(response.status).toBe(401);
  });
});
