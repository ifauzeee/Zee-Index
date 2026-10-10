import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

import { getVerifiedSession, isPending2FA } from "@/lib/verified-session";

function makeSession(overrides: Partial<Session["user"]> = {}): Session {
  return {
    expires: new Date(Date.now() + 60_000).toISOString(),
    user: {
      email: "user@example.com",
      name: "User",
      role: "USER",
      isGuest: false,
      ...overrides,
    },
  };
}

describe("isPending2FA", () => {
  it("returns false when there is no session", () => {
    expect(isPending2FA(null)).toBe(false);
  });

  it("returns true when the session is pending 2FA", () => {
    expect(isPending2FA(makeSession({ twoFactorRequired: true }))).toBe(true);
  });

  it("returns false when the session is verified", () => {
    expect(isPending2FA(makeSession({ twoFactorRequired: false }))).toBe(false);
    expect(isPending2FA(makeSession())).toBe(false);
  });
});

describe("getVerifiedSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("treats a session with twoFactorRequired as unverified", async () => {
    mockAuth.mockResolvedValue({
      user: { email: "a@x", role: "ADMIN", twoFactorRequired: true },
      expires: "",
    });

    expect(await getVerifiedSession()).toBeNull();
  });

  it("returns a verified session unchanged", async () => {
    const session = makeSession({ twoFactorRequired: false });

    mockAuth.mockResolvedValue(session);

    expect(await getVerifiedSession()).toBe(session);
  });

  it("returns the session when 2FA is not involved at all", async () => {
    const session = makeSession();

    mockAuth.mockResolvedValue(session);

    expect(await getVerifiedSession()).toBe(session);
  });

  it("returns null when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    expect(await getVerifiedSession()).toBeNull();
  });
});
