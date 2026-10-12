import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isAccessRestricted,
  redactRestrictedPath,
  __resetCache,
} from "@/lib/securityUtils";
import { memoryCache } from "@/lib/memory-cache";

vi.mock("@/lib/db", () => ({
  db: {
    protectedFolder: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/drive", () => ({
  getFileDetailsFromDrive: vi.fn(),
  getAccessToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  hasUserAccess: vi.fn(),
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    get: vi.fn(),
  },
}));

vi.mock("@/lib/config", () => ({
  getRootFolderId: vi.fn(),
}));

vi.mock("@/lib/app-config", () => ({
  getAppConfig: vi.fn(),
}));

vi.mock("@/lib/storage/providers", () => ({
  getActiveProvider: () => ({ idPrefix: "s3:" }),
}));

import { db } from "@/lib/db";
import { getFileDetailsFromDrive, getAccessToken } from "@/lib/drive";
import { hasUserAccess } from "@/lib/auth";
import { kv } from "@/lib/kv";
import { getRootFolderId } from "@/lib/config";
import { getAppConfig } from "@/lib/app-config";

const ROOT_ID = "root-id";

/** Build a Drive folder tree keyed by id, with a `parents` list per node. */
function driveTree(nodes: Record<string, { parents: string[] }>) {
  (
    getFileDetailsFromDrive as unknown as ReturnType<typeof vi.fn>
  ).mockImplementation((id: string) => {
    const node = nodes[id];
    if (!node) return Promise.resolve(null);
    return Promise.resolve({ id, parents: node.parents });
  });
}

/** Walk `depth` parents below ROOT_ID, returning { id, nodes }. */
function nestedBelowRoot(depth: number, leafId = "leaf") {
  const nodes: Record<string, { parents: string[] }> = {};
  const chain = [`${leafId}-0`, `${leafId}-1`];
  for (let i = 2; i < depth; i++) chain.push(`${leafId}-${i}`);

  // leaf's parent is chain[depth-2] ... up to chain[0], whose parent is ROOT_ID
  nodes[`${leafId}-0`] = { parents: [ROOT_ID] };
  for (let i = 1; i < chain.length; i++) {
    nodes[chain[i]] = { parents: [chain[i - 1]] };
  }
  if (depth === 1) {
    nodes[leafId] = { parents: [ROOT_ID] };
  } else {
    nodes[leafId] = { parents: [chain[chain.length - 1]] };
  }
  return { leafId, nodes };
}

describe("isAccessRestricted root scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetCache();
    memoryCache.clear();
    process.env.NEXT_PUBLIC_ROOT_FOLDER_ID = ROOT_ID;
    process.env.NEXT_PUBLIC_MANUAL_DRIVES = "";
    delete process.env.NEXT_PUBLIC_MANUAL_DRIVES;
    (
      db.protectedFolder.findMany as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);
    (kv.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getAccessToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      "token",
    );
    (getRootFolderId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      ROOT_ID,
    );
    (getAppConfig as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      localStorageAuthEnabled: false,
    });
    (hasUserAccess as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      false,
    );
  });

  it("restricts the account's My Drive root (no parents, not an allowed root)", async () => {
    driveTree({ myDriveRoot: { parents: [] } });

    expect(await isAccessRestricted("myDriveRoot")).toBe(true);
  });

  it("allows the configured root itself", async () => {
    driveTree({ [ROOT_ID]: { parents: [] } });

    expect(await isAccessRestricted(ROOT_ID)).toBe(false);
  });

  it("allows a file directly below the configured root", async () => {
    driveTree({ "below-root": { parents: [ROOT_ID] } });

    expect(await isAccessRestricted("below-root")).toBe(false);
  });

  it("allows a file nested 8 levels below the configured root", async () => {
    const { leafId, nodes } = nestedBelowRoot(8);
    driveTree(nodes);

    expect(await isAccessRestricted(leafId)).toBe(false);
  });

  it("allows deep files by default, without an explicit maxDepth", async () => {
    // An unrelated protected folder keeps the restricted-parent walk alive;
    // with the old 5-level cap the leaf itself was hidden (fail-closed).
    const { leafId, nodes } = nestedBelowRoot(8);
    driveTree(nodes);
    (
      db.protectedFolder.findMany as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([{ folderId: "unrelated-folder" }]);

    expect(await isAccessRestricted(leafId)).toBe(false);
  });

  it("restricts a file with a protected ancestor beyond 5 levels", async () => {
    // leaf-1 is protected and sits 7 parent-steps above the leaf: the walk
    // must reach it instead of tripping the depth cap first.
    const { leafId, nodes } = nestedBelowRoot(8);
    driveTree(nodes);
    (
      db.protectedFolder.findMany as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([{ folderId: "leaf-1" }]);

    expect(await isAccessRestricted(leafId)).toBe(true);
  });

  it("allows a file inside a manual (shared) drive", async () => {
    process.env.NEXT_PUBLIC_MANUAL_DRIVES = "manual-drive-1";
    driveTree({ "in-manual": { parents: ["manual-drive-1"] } });

    expect(await isAccessRestricted("in-manual")).toBe(false);
  });

  it("allows a manual drive id itself", async () => {
    process.env.NEXT_PUBLIC_MANUAL_DRIVES = "manual-drive-1";
    driveTree({ "manual-drive-1": { parents: ["another-root"] } });

    expect(await isAccessRestricted("manual-drive-1")).toBe(false);
  });

  it("restricts a file whose parent chain leaves the allowed roots", async () => {
    driveTree({
      outside: { parents: ["some-other-root"] },
      "some-other-root": { parents: [] },
    });

    expect(await isAccessRestricted("outside")).toBe(true);
  });

  it("does not apply root scoping to local-storage ids", async () => {
    expect(await isAccessRestricted("local-storage:a")).toBe(false);
  });

  it("does not apply root scoping to provider ids", async () => {
    // With s3 active, "s3:" is the provider prefix, not a Drive id.
    expect(await isAccessRestricted("s3:some-bucket/a.txt")).toBe(false);
  });

  it("does not apply root scoping to the virtual root", async () => {
    expect(await isAccessRestricted("virtual-root")).toBe(false);
  });

  it("restricts a Drive id whose metadata cannot be found", async () => {
    driveTree({});

    expect(await isAccessRestricted("missing-file")).toBe(true);
  });

  it("blocks a protected folder referenced through a .. alias", async () => {
    // The raw id does not name the protected folder, but its canonical form
    // is exactly the protected folder (no filename segment below it).
    (
      db.protectedFolder.findMany as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([{ folderId: "local-storage:secret" }]);

    expect(await isAccessRestricted("local-storage:public/../secret")).toBe(
      true,
    );
  });

  it("resolves allowed roots once per top-level check, not per parent", async () => {
    // The parent walk recurses through several levels; re-reading the root
    // config at every level multiplies KV reads during searches. The walk
    // (isWithinAllowedRoots) must receive the already-resolved set instead
    // of calling getAllowedRootIds again.
    driveTree({
      mid: { parents: [ROOT_ID] },
      leaf: { parents: ["mid"] },
    });

    await isAccessRestricted("leaf");

    expect(getRootFolderId).toHaveBeenCalledTimes(1);
  });

  it("does not resolve Drive roots for a local-storage id", async () => {
    // A local file needs no Drive metadata; resolving the root alias would
    // turn a Drive/network failure into a 500 for requests that never touch
    // Drive.
    driveTree({});

    expect(await isAccessRestricted("local-storage:docs/a.txt")).toBe(false);
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(getRootFolderId).not.toHaveBeenCalled();
  });

  it("resolves the root alias to the real root id", async () => {
    // .env.example documents NEXT_PUBLIC_ROOT_FOLDER_ID=root; Drive parent
    // ids are real ids, so the alias itself never matches a parent chain.
    (getRootFolderId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      "root",
    );
    (kv.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) =>
        key === "drive:alias:root"
          ? Promise.resolve("real-root-id")
          : Promise.resolve(null),
    );
    driveTree({ below: { parents: ["real-root-id"] } });

    expect(await isAccessRestricted("below")).toBe(false);
  });

  it("does not cache a failed Drive lookup as outside-the-root", async () => {
    // A transient Drive error (e.g. 429) must not pin the file as outside
    // the root for the full 10 minute cache TTL. The request itself still
    // fails closed (hidden for that one request); only the caching changes.
    (getFileDetailsFromDrive as unknown as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("drive 429"))
      .mockImplementation((id: string) =>
        Promise.resolve({ id, parents: [ROOT_ID] }),
      );

    await isAccessRestricted("flaky-file");
    expect(memoryCache.get<boolean>("scope:inroot:flaky-file")).toBeNull();

    // Once Drive recovers, the same file resolves as inside the root and
    // only then is the positive result cached.
    expect(await isAccessRestricted("flaky-file")).toBe(false);
    expect(memoryCache.get<boolean>("scope:inroot:flaky-file")).toBe(true);
  });

  it("stays fail-closed when the root alias cannot be resolved", async () => {
    // With NEXT_PUBLIC_ROOT_FOLDER_ID=root and a Drive alias lookup failing,
    // nothing may count as inside the root for non-admins.
    (getRootFolderId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      "root",
    );
    (kv.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );
    // A fresh id: positive scoping results are cached per id for 10 minutes
    // and the alias test above already cached its own id.
    driveTree({ "below-unresolvable-alias": { parents: ["real-root-id"] } });

    try {
      expect(await isAccessRestricted("below-unresolvable-alias")).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("redactRestrictedPath", () => {
  const path = [
    { id: ROOT_ID, name: "Google Drive" },
    { id: "public", name: "Public" },
    { id: "payroll", name: "Payroll 2026" },
    { id: "q3", name: "Q3" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    __resetCache();
    (
      db.protectedFolder.findMany as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([{ folderId: "payroll" }]);
    (hasUserAccess as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      false,
    );
  });

  it("hides a locked folder and everything below it", async () => {
    const result = await redactRestrictedPath(path, [], null, "Locked");

    expect(result.map((n) => n.name)).toEqual([
      "Google Drive",
      "Public",
      "Locked",
      "Locked",
    ]);
    expect(result.map((n) => n.id)).toEqual(path.map((n) => n.id));
  });

  it("shows names once the folder token was presented", async () => {
    const result = await redactRestrictedPath(
      path,
      ["payroll"],
      null,
      "Locked",
    );

    expect(result).toEqual(path);
  });

  it("shows names to a user granted access by email", async () => {
    (hasUserAccess as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (_email: string, id: string) => id === "payroll",
    );

    const result = await redactRestrictedPath(
      path,
      [],
      "user@example.com",
      "Locked",
    );

    expect(result).toEqual(path);
  });
});

describe("isAccessRestricted for provider paths (Z2-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetCache();
    memoryCache.clear();
    (getAppConfig as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      localStorageAuthEnabled: false,
    });
    (hasUserAccess as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      false,
    );
    // S3 folder ids are listed with a trailing slash.
    (
      db.protectedFolder.findMany as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([{ folderId: "s3:secret/" }]);
  });

  it("protects files inside a protected provider folder", async () => {
    expect(await isAccessRestricted("s3:secret/report.pdf")).toBe(true);
    expect(await isAccessRestricted("s3:secret/deep/a/b.txt")).toBe(true);
    expect(await isAccessRestricted("s3:secret")).toBe(true);
  });

  it("does not let .. reach a protected folder from a public one", async () => {
    expect(await isAccessRestricted("s3:public/../secret/report.pdf")).toBe(
      true,
    );
  });

  it("treats a path that escapes the provider root as restricted", async () => {
    expect(await isAccessRestricted("s3:../outside.txt")).toBe(true);
  });

  it("leaves sibling folders and the folder token holder alone", async () => {
    expect(await isAccessRestricted("s3:public/a.pdf")).toBe(false);
    expect(await isAccessRestricted("s3:secretive/a.pdf")).toBe(false);
    expect(
      await isAccessRestricted("s3:secret/report.pdf", ["s3:secret/"]),
    ).toBe(false);
  });
});
