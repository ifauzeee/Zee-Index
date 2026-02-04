import { describe, it, expect, vi, beforeEach } from "vitest";
import { isAccessRestricted } from "@/lib/securityUtils";

vi.mock("@/lib/kv", () => ({
  kv: {
    hgetall: vi.fn(),
  },
}));

vi.mock("@/lib/drive", () => ({
  getFileDetailsFromDrive: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  hasUserAccess: vi.fn(),
}));

import { kv } from "@/lib/kv";
import { getFileDetailsFromDrive } from "@/lib/drive";
import { hasUserAccess } from "@/lib/auth";

describe("lib/securityUtils/isAccessRestricted", () => {
  const PROTECTED_ID = "protected-folder-id";
  const PRIVATE_ID = "private-folder-id";
  const PUBLIC_ID = "public-file-id";
  const NESTED_ID = "nested-file-id";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PRIVATE_FOLDER_IDS = PRIVATE_ID;
    process.env.NEXT_PUBLIC_ROOT_FOLDER_ID = "root-id";
  });

  it("blocks access to protected folder without token or user", async () => {
    (kv.hgetall as any).mockResolvedValue({ [PROTECTED_ID]: "some-config" });

    const result = await isAccessRestricted(PROTECTED_ID);
    expect(result).toBe(true);
  });

  it("allows access to protected folder with valid token", async () => {
    (kv.hgetall as any).mockResolvedValue({ [PROTECTED_ID]: "some-config" });

    const result = await isAccessRestricted(PROTECTED_ID, [PROTECTED_ID]);
    expect(result).toBe(false);
  });

  it("allows access to protected folder with whitelist user email", async () => {
    (kv.hgetall as any).mockResolvedValue({ [PROTECTED_ID]: "some-config" });
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
    (kv.hgetall as any).mockResolvedValue({ [PROTECTED_ID]: "some-config" });
    (hasUserAccess as any).mockResolvedValue(false);

    const result = await isAccessRestricted(
      PROTECTED_ID,
      [],
      "stranger@example.com",
    );
    expect(result).toBe(true);
  });

  it("recursively checks parents for protection", async () => {
    (kv.hgetall as any).mockResolvedValue({ [PROTECTED_ID]: "some-config" });
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
    (kv.hgetall as any).mockResolvedValue({});
    (getFileDetailsFromDrive as any).mockImplementation(async (id: string) => {
      if (id === PUBLIC_ID) return { id, parents: ["root-id"] };
      return null;
    });

    const result = await isAccessRestricted(PUBLIC_ID);
    expect(result).toBe(false);
  });

  it("handles environment variable private folders", async () => {
    (kv.hgetall as any).mockResolvedValue({});

    const result = await isAccessRestricted(PRIVATE_ID);
    expect(result).toBe(true);
  });
});
