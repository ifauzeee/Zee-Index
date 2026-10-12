import { describe, it, expect, vi, beforeEach } from "vitest";
import { isAccessRestricted, __resetCache } from "@/lib/securityUtils";

vi.mock("@/lib/db", () => ({
  db: {
    protectedFolder: {
      findMany: vi.fn(),
    },
    adminConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
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
  getActiveProvider: vi.fn(),
}));

import { db } from "@/lib/db";
import { getFileDetailsFromDrive } from "@/lib/drive";
import { hasUserAccess } from "@/lib/auth";
import { kv } from "@/lib/kv";
import { getRootFolderId } from "@/lib/config";
import { getAppConfig } from "@/lib/app-config";
import { getActiveProvider } from "@/lib/storage/providers";

describe("lib/securityUtils/isAccessRestricted", () => {
  const PROTECTED_ID = "protected-folder-id";
  const PRIVATE_ID = "private-folder-id";
  const PUBLIC_ID = "public-file-id";
  const NESTED_ID = "nested-file-id";
  const ROOT_ID = "root-id";

  beforeEach(() => {
    vi.clearAllMocks();
    __resetCache();
    process.env.PRIVATE_FOLDER_IDS = PRIVATE_ID;
    process.env.NEXT_PUBLIC_ROOT_FOLDER_ID = ROOT_ID;
    delete process.env.NEXT_PUBLIC_MANUAL_DRIVES;
    (
      getFileDetailsFromDrive as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation((id: string) =>
      Promise.resolve({ id, parents: [ROOT_ID] }),
    );
    (kv.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getRootFolderId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      ROOT_ID,
    );
    (getAppConfig as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      localStorageAuthEnabled: false,
    });
    (getActiveProvider as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      null,
    );
  });

  it("blocks access to protected folder without token or user", async () => {
    (db.protectedFolder.findMany as any).mockResolvedValue([
      { folderId: PROTECTED_ID },
    ]);

    const result = await isAccessRestricted(PROTECTED_ID);
    expect(result).toBe(true);
  });

  it("allows access to protected folder with valid token", async () => {
    (db.protectedFolder.findMany as any).mockResolvedValue([
      { folderId: PROTECTED_ID },
    ]);

    const result = await isAccessRestricted(PROTECTED_ID, [PROTECTED_ID]);
    expect(result).toBe(false);
  });

  it("allows access to protected folder with whitelist user email", async () => {
    (db.protectedFolder.findMany as any).mockResolvedValue([
      { folderId: PROTECTED_ID },
    ]);
    (hasUserAccess as any).mockResolvedValue(true);

    const result = await isAccessRestricted(
      PROTECTED_ID,
      [],
      "user@example.com",
    );
    expect(result).toBe(false);
    expect(hasUserAccess).toHaveBeenCalledWith(
      "user@example.com",
      PROTECTED_ID,
    );
  });

  it("blocks access if user email is not whitelisted", async () => {
    (db.protectedFolder.findMany as any).mockResolvedValue([
      { folderId: PROTECTED_ID },
    ]);
    (hasUserAccess as any).mockResolvedValue(false);

    const result = await isAccessRestricted(
      PROTECTED_ID,
      [],
      "stranger@example.com",
    );
    expect(result).toBe(true);
  });

  it("blocks a local-storage id that escapes a protected folder via ..", async () => {
    (db.protectedFolder.findMany as any).mockResolvedValue([
      { folderId: "local-storage:secret" },
    ]);

    // The raw id does not name the protected folder, but its canonical form does.
    const result = await isAccessRestricted(
      "local-storage:public/../secret/a.txt",
    );

    expect(result).toBe(true);
  });

  it("rejects a local-storage id that escapes the root entirely", async () => {
    (db.protectedFolder.findMany as any).mockResolvedValue([
      { folderId: PROTECTED_ID },
    ]);

    const result = await isAccessRestricted("local-storage:../../etc/passwd");

    expect(result).toBe(true);
  });

  it("recursively checks parents for protection", async () => {
    (db.protectedFolder.findMany as any).mockResolvedValue([
      { folderId: PROTECTED_ID },
    ]);
    (getFileDetailsFromDrive as any).mockImplementation(async (id: string) => {
      if (id === NESTED_ID) return { id: NESTED_ID, parents: [PROTECTED_ID] };
      if (id === PROTECTED_ID)
        return { id: PROTECTED_ID, parents: ["root-id"] };
      return null;
    });

    const resultBlocked = await isAccessRestricted(NESTED_ID);
    expect(resultBlocked).toBe(true);
    expect(getFileDetailsFromDrive).toHaveBeenCalledWith(NESTED_ID);

    const resultAllowed = await isAccessRestricted(NESTED_ID, [PROTECTED_ID]);
    expect(resultAllowed).toBe(false);
  });

  it("stops recursion at root folder", async () => {
    (db.protectedFolder.findMany as any).mockResolvedValue([]);
    (getFileDetailsFromDrive as any).mockImplementation(async (id: string) => {
      if (id === PUBLIC_ID) return { id, parents: ["root-id"] };
      return null;
    });

    const result = await isAccessRestricted(PUBLIC_ID);
    expect(result).toBe(false);
  });

  it("handles environment variable private folders", async () => {
    (db.protectedFolder.findMany as any).mockResolvedValue([]);

    const result = await isAccessRestricted(PRIVATE_ID);
    expect(result).toBe(true);
  });
});
