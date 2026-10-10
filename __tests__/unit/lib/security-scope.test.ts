import { describe, it, expect, vi, beforeEach } from "vitest";
import { isAccessRestricted } from "@/lib/securityUtils";

vi.mock("@/lib/db", () => ({
  db: {
    protectedFolder: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/drive", () => ({
  getFileDetailsFromDrive: vi.fn(),
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
  isProviderId: (id: string) => id.startsWith("s3:"),
}));

import { db } from "@/lib/db";
import { getFileDetailsFromDrive } from "@/lib/drive";
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
    process.env.NEXT_PUBLIC_ROOT_FOLDER_ID = ROOT_ID;
    process.env.NEXT_PUBLIC_MANUAL_DRIVES = "";
    delete process.env.NEXT_PUBLIC_MANUAL_DRIVES;
    (
      db.protectedFolder.findMany as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);
    (kv.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
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

    expect(await isAccessRestricted(leafId, [], null, 0, 20)).toBe(false);
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
});
