import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindUnique, mockUpdateMany } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: mockFindUnique, updateMany: mockUpdateMany } },
}));

import { memoryCache } from "@/lib/memory-cache";
import { getSessionVersion, revokeSessions } from "@/lib/session-version";

describe("lib/session-version", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memoryCache.clear();
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("reads the version once and serves repeats from cache", async () => {
    mockFindUnique.mockResolvedValue({ sessionVersion: 3 });

    expect(await getSessionVersion("User@Example.com")).toBe(3);
    expect(await getSessionVersion("user@example.com")).toBe(3);
    expect(mockFindUnique).toHaveBeenCalledTimes(1);
  });

  it("returns null for a user that no longer exists", async () => {
    mockFindUnique.mockResolvedValue(null);

    expect(await getSessionVersion("gone@example.com")).toBeNull();
  });

  it("bumps the version and drops the cached value", async () => {
    mockFindUnique.mockResolvedValueOnce({ sessionVersion: 0 });
    await getSessionVersion("user@example.com");

    await revokeSessions("User@Example.com");
    mockFindUnique.mockResolvedValueOnce({ sessionVersion: 1 });

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      data: { sessionVersion: { increment: 1 } },
    });
    expect(await getSessionVersion("user@example.com")).toBe(1);
  });
});
