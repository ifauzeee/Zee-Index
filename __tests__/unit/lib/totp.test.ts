import { authenticator } from "otplib";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { counters } = vi.hoisted(() => ({
  counters: new Map<string, number>(),
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    incr: async (key: string) => {
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return next;
    },
    expire: async () => 1,
  },
}));

import { verifyTotpOnce } from "@/lib/totp";

const SECRET = authenticator.generateSecret();

describe("verifyTotpOnce", () => {
  beforeEach(() => counters.clear());

  it("accepts a valid code once and rejects its replay", async () => {
    const code = authenticator.generate(SECRET);

    expect(await verifyTotpOnce("user@example.com", code, SECRET)).toBe(true);
    expect(await verifyTotpOnce("user@example.com", code, SECRET)).toBe(false);
  });

  it("tracks use per user", async () => {
    const code = authenticator.generate(SECRET);

    expect(await verifyTotpOnce("a@example.com", code, SECRET)).toBe(true);
    expect(await verifyTotpOnce("B@example.com", code, SECRET)).toBe(true);
    expect(await verifyTotpOnce("b@example.com", code, SECRET)).toBe(false);
  });

  it("rejects a wrong code without spending the step", async () => {
    expect(await verifyTotpOnce("user@example.com", "000000", SECRET)).toBe(
      authenticator.check("000000", SECRET),
    );
    expect(counters.size).toBe(authenticator.check("000000", SECRET) ? 1 : 0);
  });
});
