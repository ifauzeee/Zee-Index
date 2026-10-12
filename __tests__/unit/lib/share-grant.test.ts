import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  jwtVerify: vi.fn(),
  kvGet: vi.fn(),
  kvIncr: vi.fn(),
  kvExpire: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("jose", () => ({ jwtVerify: mocks.jwtVerify }));
vi.mock("@/lib/kv", () => ({
  kv: { get: mocks.kvGet, incr: mocks.kvIncr, expire: mocks.kvExpire },
}));
vi.mock("@/lib/db", () => ({
  db: { shareLink: { findUnique: mocks.findUnique, update: mocks.update } },
}));

import {
  idFromSharePath,
  isShareGrantFor,
  recordShareView,
  resolveShareGrant,
  shareGrantToken,
  sharedItemIds,
} from "@/lib/share-grant";

const RECORD = {
  jti: "jti-1",
  path: "/folder/parent/file/file-1/report.pdf",
  isCollection: false,
  revokedAt: null,
  maxUses: null,
  views: 0,
  loginRequired: false,
};

describe("idFromSharePath", () => {
  it.each([
    ["/folder/parent/file/file-1/report.pdf", "file-1"],
    ["/folder/folder-1", "folder-1"],
    [
      "/folder/local-storage:docs/file/local-storage:docs/a.pdf/a.pdf",
      "local-storage:docs/a.pdf",
    ],
    ["/folder/local-storage:docs/team", "local-storage:docs/team"],
    ["/share/jti-1", null],
    ["/elsewhere", null],
  ])("%s -> %s", (path, expected) => {
    expect(idFromSharePath(path)).toBe(expected);
  });
});

describe("share grant tokens", () => {
  it("round-trips item ids", () => {
    const tokens = ["folder-token", shareGrantToken("a"), shareGrantToken("b")];
    expect(sharedItemIds(tokens)).toEqual(["a", "b"]);
    expect(isShareGrantFor(tokens, "a")).toBe(true);
    expect(isShareGrantFor(tokens, "folder-token")).toBe(false);
  });
});

describe("resolveShareGrant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHARE_SECRET_KEY = "x".repeat(32);
    mocks.jwtVerify.mockResolvedValue({ payload: { jti: "jti-1" } });
    mocks.kvGet.mockResolvedValue(null);
    mocks.findUnique.mockResolvedValue(RECORD);
  });

  it("grants exactly the shared file", async () => {
    const grant = await resolveShareGrant("token", null);
    expect(grant).toMatchObject({ ok: true, itemIds: ["file-1"] });
  });

  it("grants every item of a collection", async () => {
    mocks.findUnique.mockResolvedValue({
      ...RECORD,
      isCollection: true,
      path: "/share/jti-1",
    });
    mocks.kvGet.mockImplementation(async (key: string) =>
      key.includes("share-items")
        ? [
            {
              id: "a",
              name: "a",
              mimeType: "x",
              modifiedTime: "",
              createdTime: "",
              webViewLink: "",
              trashed: false,
              hasThumbnail: false,
              isFolder: false,
            },
            {
              id: "b",
              name: "b",
              mimeType: "x",
              modifiedTime: "",
              createdTime: "",
              webViewLink: "",
              trashed: false,
              hasThumbnail: false,
              isFolder: true,
            },
          ]
        : null,
    );

    const grant = await resolveShareGrant("token", null);
    expect(grant).toMatchObject({ ok: true, itemIds: ["a", "b"] });
  });

  it.each([
    ["invalid", () => mocks.jwtVerify.mockRejectedValue(new Error("bad"))],
    ["revoked", () => mocks.kvGet.mockResolvedValue("blocked")],
    [
      "revoked",
      () =>
        mocks.findUnique.mockResolvedValue({
          ...RECORD,
          revokedAt: new Date(),
        }),
    ],
    [
      "max_uses",
      () =>
        mocks.findUnique.mockResolvedValue({ ...RECORD, maxUses: 3, views: 3 }),
    ],
    [
      "login_required",
      () =>
        mocks.findUnique.mockResolvedValue({ ...RECORD, loginRequired: true }),
    ],
  ])("refuses with %s", async (reason, setup) => {
    setup();
    expect(await resolveShareGrant("token", null)).toEqual({
      ok: false,
      reason,
    });
  });
});

describe("recordShareView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counts a viewer once per window", async () => {
    mocks.kvIncr.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    await recordShareView("jti-1", "203.0.113.9");
    await recordShareView("jti-1", "203.0.113.9");

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { jti: "jti-1" },
      data: { views: { increment: 1 } },
    });
  });
});
