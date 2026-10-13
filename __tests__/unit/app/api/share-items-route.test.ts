import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockKvGet, mockShareLinkFindUnique, session } = vi.hoisted(() => ({
  mockKvGet: vi.fn(),
  mockShareLinkFindUnique: vi.fn(),
  session: {
    current: { user: { email: "user@test.com", role: "USER" } } as
      object | null,
  },
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async (request: NextRequest) =>
      handler({
        request,
        params: { shareId: "test-collection" },
        session: session.current,
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
    payload: { jti: "test-collection", loginRequired: false },
  }),
}));

process.env.SHARE_SECRET_KEY = "test-secret-key-at-least-32-chars-long!";

import { GET } from "@/app/api/share/items/[shareId]/route";

const driveFile = {
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

// Shape produced by lib/storage/local.ts: no webViewLink, no trashed.
const localFile = {
  id: "local-storage:docs/report.pdf",
  name: "report.pdf",
  mimeType: "application/pdf",
  size: "2048",
  modifiedTime: "2025-01-01T00:00:00Z",
  createdTime: "2025-01-01T00:00:00Z",
  isFolder: false,
  source: "local",
  hasThumbnail: false,
  path: "docs/report.pdf",
};

// WebDAV entries carry neither createdTime nor parents.
const webdavFile = {
  id: "webdav:music/song.mp3",
  name: "song.mp3",
  mimeType: "audio/mpeg",
  modifiedTime: "2025-01-01T00:00:00Z",
  isFolder: false,
  source: "webdav",
  hasThumbnail: false,
};

const shareRecord = {
  jti: "test-collection",
  itemName: "Shared Collection",
  isCollection: true,
  path: "/share/test-collection",
  revokedAt: null,
  maxUses: null,
  views: 0,
  loginRequired: false,
};

let storedItems: unknown;
let blocked: unknown;

function request(query = "?share_token=valid-token") {
  return GET(
    new NextRequest(
      `http://localhost:3000/api/share/items/test-collection${query}`,
    ),
  );
}

describe("app/api/share/items/[shareId] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.current = { user: { email: "user@test.com", role: "USER" } };
    storedItems = [driveFile];
    blocked = null;
    mockKvGet.mockImplementation(async (key: string) =>
      key.includes("blocked") ? blocked : storedItems,
    );
    mockShareLinkFindUnique.mockResolvedValue(shareRecord);
  });

  it("returns collection items for valid token", async () => {
    const response = await request();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toHaveLength(1);
    expect(data.collectionName).toBe("Shared Collection");
  });

  it("returns local-storage and provider items too", async () => {
    storedItems = [driveFile, localFile, webdavFile];

    const response = await request();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items.map((item: { id: string }) => item.id)).toEqual([
      "item-1",
      "local-storage:docs/report.pdf",
      "webdav:music/song.mp3",
    ]);
    expect(data.items[1]).toMatchObject({
      source: "local",
      path: "docs/report.pdf",
    });
  });

  it("returns 401 when share_token is missing", async () => {
    const response = await request("");

    expect(response.status).toBe(401);
  });

  it("returns 403 when token is blocked", async () => {
    blocked = "blocked";

    expect((await request()).status).toBe(403);
  });

  it("returns 403 when the link was revoked in the database", async () => {
    mockShareLinkFindUnique.mockResolvedValue({
      ...shareRecord,
      revokedAt: new Date(),
    });

    expect((await request()).status).toBe(403);
  });

  it("returns 403 once maxUses is reached", async () => {
    mockShareLinkFindUnique.mockResolvedValue({
      ...shareRecord,
      maxUses: 3,
      views: 3,
    });

    expect((await request()).status).toBe(403);
  });

  it("returns 401 for a login-only link without a session", async () => {
    session.current = null;
    mockShareLinkFindUnique.mockResolvedValue({
      ...shareRecord,
      loginRequired: true,
    });

    expect((await request()).status).toBe(401);
  });

  it("returns 403 for a token of a single-file share", async () => {
    mockShareLinkFindUnique.mockResolvedValue({
      ...shareRecord,
      isCollection: false,
      path: "/folder/abc/file/def/x",
    });

    expect((await request()).status).toBe(403);
  });

  it("returns 404 when collection not found", async () => {
    storedItems = null;

    expect((await request()).status).toBe(404);
  });

  it("returns 401 on invalid token", async () => {
    const { jwtVerify } = await import("jose");
    (jwtVerify as any).mockRejectedValueOnce(new Error("Invalid token"));

    expect((await request("?share_token=bad-token")).status).toBe(401);
  });
});
