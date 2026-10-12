import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

const { store, mockFindUnique, mockUpdate } = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      store.set(key, value);
      return "OK";
    },
    del: async (...keys: string[]) => {
      keys.forEach((k) => store.delete(k));
      return keys.length;
    },
  },
}));
vi.mock("@/lib/db", () => ({
  db: { apiKey: { findUnique: mockFindUnique, update: mockUpdate } },
}));

import { clearApiKeyCache, validateApiKey } from "@/lib/api-key";

const KEY = "ab12cd34" + "0".repeat(56);
const SAME_PREFIX_KEY = "ab12cd34" + "f".repeat(56);

describe("validateApiKey (Z2-09)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    store.clear();
    mockUpdate.mockResolvedValue({});
    mockFindUnique.mockResolvedValue({
      id: "key-1",
      name: "CI",
      keyPrefix: "ab12cd34",
      keyHash: await bcrypt.hash(KEY, 4),
      permissions: ["files:read"],
      revoked: false,
      expiresAt: null,
    });
  });

  it("accepts the real key and serves repeats from cache", async () => {
    expect(await validateApiKey(KEY)).toEqual({
      id: "key-1",
      name: "CI",
      permissions: ["files:read"],
    });
    expect(await validateApiKey(KEY)).not.toBeNull();
    expect(mockFindUnique).toHaveBeenCalledTimes(1);
  });

  it("rejects a different key with the same prefix after the real one was cached", async () => {
    await validateApiKey(KEY);

    expect(await validateApiKey(SAME_PREFIX_KEY)).toBeNull();
  });

  it("stops accepting a cached key once it expires", async () => {
    mockFindUnique.mockResolvedValue({
      ...(await mockFindUnique()),
      expiresAt: new Date(Date.now() + 50),
    });
    expect(await validateApiKey(KEY)).not.toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(await validateApiKey(KEY)).toBeNull();
  });

  it("revoking by id drops the cached entry", async () => {
    await validateApiKey(KEY);
    mockFindUnique.mockResolvedValue(null);

    await clearApiKeyCache("key-1");

    expect(await validateApiKey(KEY)).toBeNull();
  });
});
