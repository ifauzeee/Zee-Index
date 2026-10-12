import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockKv, mockDb } = vi.hoisted(() => ({
  mockKv: { get: vi.fn(), del: vi.fn() },
  mockDb: {
    user: { findUnique: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/kv", () => ({ kv: mockKv }));
vi.mock("@/lib/db", () => ({ db: mockDb }));

import {
  disableTwoFactor,
  enableTwoFactor,
  getPasswordHash,
  getTwoFactorState,
  setPasswordHash,
} from "@/lib/credentials";

const MIGRATED = new Date("2026-10-13T00:00:00Z");

function legacyRedis(values: Record<string, unknown>) {
  mockKv.get.mockImplementation(async (key: string) => values[key] ?? null);
}

describe("lib/credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKv.get.mockResolvedValue(null);
    mockKv.del.mockResolvedValue(0);
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.upsert.mockImplementation(
      async ({ update }: { update: Record<string, unknown> }) => ({
        passwordHash: null,
        twoFactorSecret: null,
        twoFactorEnabled: false,
        ...update,
      }),
    );
    mockDb.user.updateMany.mockResolvedValue({ count: 1 });
  });

  it("reads migrated credentials from Postgres without touching Redis", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      passwordHash: "$2a$hash",
      twoFactorSecret: "SECRET",
      twoFactorEnabled: true,
      credentialsMigratedAt: MIGRATED,
    });

    expect(await getTwoFactorState("User@Example.com")).toEqual({
      enabled: true,
      secret: "SECRET",
    });
    expect(await getPasswordHash("user@example.com")).toBe("$2a$hash");
    expect(mockDb.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "user@example.com" } }),
    );
    expect(mockKv.get).not.toHaveBeenCalled();
  });

  it("copies legacy Redis 2FA and password to Postgres, then deletes the keys", async () => {
    legacyRedis({
      "password:user@example.com": "$2a$legacy",
      "2fa:secret:user@example.com": "LEGACY",
      "2fa:enabled:user@example.com": true,
    });

    const state = await getTwoFactorState("user@example.com");

    expect(state).toEqual({ enabled: true, secret: "LEGACY" });
    expect(mockDb.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "user@example.com" },
        update: expect.objectContaining({
          passwordHash: "$2a$legacy",
          twoFactorSecret: "LEGACY",
          twoFactorEnabled: true,
          credentialsMigratedAt: expect.any(Date),
        }),
      }),
    );
    expect(mockKv.del).toHaveBeenCalledWith(
      "password:user@example.com",
      "2fa:secret:user@example.com",
      "2fa:enabled:user@example.com",
    );
  });

  it("does not treat an enabled flag without a secret as 2FA on", async () => {
    legacyRedis({ "2fa:enabled:user@example.com": true });

    expect((await getTwoFactorState("user@example.com")).enabled).toBe(false);
  });

  it("returns no credentials for an unknown user without creating a row", async () => {
    expect(await getPasswordHash("nobody@example.com")).toBeNull();
    expect(await getTwoFactorState("nobody@example.com")).toEqual({
      enabled: false,
      secret: null,
    });
    expect(mockDb.user.upsert).not.toHaveBeenCalled();
  });

  it("fails closed when Redis cannot be read during migration", async () => {
    mockKv.get.mockRejectedValue(new Error("redis down"));

    await expect(getTwoFactorState("user@example.com")).rejects.toThrow(
      "redis down",
    );
  });

  it("keeps a value already in Postgres over a stale Redis copy", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      passwordHash: "$2a$db",
      twoFactorSecret: null,
      twoFactorEnabled: false,
      credentialsMigratedAt: null,
    });
    legacyRedis({ "password:user@example.com": "$2a$stale" });

    expect(await getPasswordHash("user@example.com")).toBe("$2a$db");
  });

  it("writes password, enable and disable to Postgres", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      passwordHash: null,
      twoFactorSecret: null,
      twoFactorEnabled: false,
      credentialsMigratedAt: MIGRATED,
    });

    await setPasswordHash("User@Example.com", "$2a$new");
    expect(mockDb.user.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { email: "user@example.com" },
        update: { passwordHash: "$2a$new" },
      }),
    );

    await enableTwoFactor("user@example.com", "NEWSECRET");
    expect(mockDb.user.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: { twoFactorSecret: "NEWSECRET", twoFactorEnabled: true },
      }),
    );

    await disableTwoFactor("user@example.com");
    expect(mockDb.user.updateMany).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      data: { twoFactorSecret: null, twoFactorEnabled: false },
    });
  });
});
