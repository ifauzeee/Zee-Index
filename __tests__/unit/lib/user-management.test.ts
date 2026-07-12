import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockKv, mockDb } = vi.hoisted(() => ({
  mockKv: {
    get: vi.fn(),
    set: vi.fn(),
    exists: vi.fn(),
    del: vi.fn(),
  },
  mockDb: {
    user: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/kv", () => ({ kv: mockKv }));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  changeOwnPassword,
  hasUserPassword,
  listUsers,
  removeUserPassword,
  setUserPassword,
  upsertUser,
  verifyUserPassword,
} from "@/lib/user-management";

describe("lib/user-management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKv.set.mockResolvedValue("OK");
    mockKv.del.mockResolvedValue(1);
    mockKv.get.mockResolvedValue(null);
    mockKv.exists.mockResolvedValue(0);
    mockDb.user.upsert.mockResolvedValue({});
    mockDb.user.findMany.mockResolvedValue([]);
  });

  it("sets and verifies a user password (bcrypt)", async () => {
    await setUserPassword("User@Example.com", "secret123");
    const key = mockKv.set.mock.calls[0][0] as string;
    expect(key).toBe("password:user@example.com");

    mockKv.get.mockResolvedValue(mockKv.set.mock.calls[0][1]);
    mockKv.exists.mockResolvedValue(1);
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
    expect(mockKv.set).toHaveBeenCalled();
  });

  it("lists users with password presence", async () => {
    mockDb.user.findMany.mockResolvedValue([
      { email: "a@example.com", role: "ADMIN", name: "a" },
      { email: "b@example.com", role: "USER", name: "b" },
    ]);
    mockKv.exists.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const users = await listUsers();
    expect(users).toEqual([
      { email: "a@example.com", role: "ADMIN", hasPassword: true, name: "a" },
      { email: "b@example.com", role: "USER", hasPassword: false, name: "b" },
    ]);
  });

  it("removes a user password", async () => {
    await removeUserPassword("user@example.com");
    expect(mockKv.del).toHaveBeenCalledWith("password:user@example.com");
  });

  it("changeOwnPassword rejects wrong current password", async () => {
    await setUserPassword("user@example.com", "oldpass");
    mockKv.get.mockResolvedValue(mockKv.set.mock.calls[0][1]);
    mockKv.exists.mockResolvedValue(1);
    await expect(
      changeOwnPassword("user@example.com", "wrong", "newpass123"),
    ).rejects.toThrow("CURRENT_PASSWORD_INVALID");
  });

  it("changeOwnPassword updates password when current is valid", async () => {
    await setUserPassword("user@example.com", "oldpass");
    mockKv.get.mockResolvedValue(mockKv.set.mock.calls[0][1]);
    mockKv.exists.mockResolvedValue(1);
    await changeOwnPassword("user@example.com", "oldpass", "newpass123");
    expect(mockKv.set).toHaveBeenCalledWith(
      "password:user@example.com",
      expect.any(String),
    );
  });
});
