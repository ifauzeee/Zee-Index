import { beforeEach, describe, expect, it, vi } from "vitest";

const { passwordStore, mockDb } = vi.hoisted(() => ({
  passwordStore: new Map<string, string | null>(),
  mockDb: {
    user: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Passwords now live in Postgres via lib/credentials; fake that store here.
vi.mock("@/lib/credentials", () => ({
  getPasswordHash: vi.fn(
    async (email: string) =>
      passwordStore.get(email.toLowerCase().trim()) ?? null,
  ),
  setPasswordHash: vi.fn(async (email: string, hash: string | null) => {
    passwordStore.set(email.toLowerCase().trim(), hash);
  }),
}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  changeOwnPassword,
  hasUserPassword,
  setUserPassword,
  upsertUser,
  verifyUserPassword,
} from "@/lib/user-management";

describe("lib/user-management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    passwordStore.clear();
    mockDb.user.upsert.mockResolvedValue({});
    mockDb.user.findMany.mockResolvedValue([]);
  });

  it("sets and verifies a user password (bcrypt)", async () => {
    await setUserPassword("User@Example.com", "secret123");
    expect(passwordStore.get("user@example.com")).toMatch(/^\$2[aby]\$/);

    expect(await verifyUserPassword("user@example.com", "secret123")).toBe(
      true,
    );
    expect(await verifyUserPassword("user@example.com", "wrong")).toBe(false);
    expect(await hasUserPassword("user@example.com")).toBe(true);
  });

  it("upserts a user with role and optional password", async () => {
    await upsertUser("editor@example.com", "EDITOR", "editorpass");
    expect(mockDb.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "editor@example.com" },
        create: expect.objectContaining({
          email: "editor@example.com",
          role: "EDITOR",
        }),
        update: { role: "EDITOR" },
      }),
    );
    expect(await hasUserPassword("editor@example.com")).toBe(true);
  });

  it("changeOwnPassword rejects wrong current password", async () => {
    await setUserPassword("user@example.com", "oldpass");
    await expect(
      changeOwnPassword("user@example.com", "wrong", "newpass123"),
    ).rejects.toThrow("CURRENT_PASSWORD_INVALID");
  });

  it("changeOwnPassword updates password when current is valid", async () => {
    await setUserPassword("user@example.com", "oldpass");
    await changeOwnPassword("user@example.com", "oldpass", "newpass123");
    expect(await verifyUserPassword("user@example.com", "newpass123")).toBe(
      true,
    );
    expect(await verifyUserPassword("user@example.com", "oldpass")).toBe(false);
  });
});
