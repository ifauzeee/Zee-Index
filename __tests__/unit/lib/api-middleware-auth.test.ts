import { describe, it, expect } from "vitest";
import type { Session } from "next-auth";
import { isAuthorized } from "@/lib/api-middleware";

function makeSession(
  overrides: Partial<Session["user"]> & { role?: Session["user"]["role"] },
): Session {
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

describe("isAuthorized", () => {
  it("allows public without session", () => {
    expect(isAuthorized("public", null)).toBe(true);
  });

  it("rejects missing session for user/editor/admin", () => {
    expect(isAuthorized("user", null)).toBe(false);
    expect(isAuthorized("editor", null)).toBe(false);
    expect(isAuthorized("admin", null)).toBe(false);
  });

  it("rejects guest sessions for user routes", () => {
    const guestByFlag = makeSession({ role: "GUEST", isGuest: true });
    const guestByRole = makeSession({ role: "GUEST", isGuest: false });
    expect(isAuthorized("user", guestByFlag)).toBe(false);
    expect(isAuthorized("user", guestByRole)).toBe(false);
    expect(isAuthorized("editor", guestByFlag)).toBe(false);
    expect(isAuthorized("admin", guestByFlag)).toBe(false);
  });

  it("allows regular users on user routes", () => {
    expect(isAuthorized("user", makeSession({ role: "USER" }))).toBe(true);
    expect(isAuthorized("user", makeSession({ role: "EDITOR" }))).toBe(true);
    expect(isAuthorized("user", makeSession({ role: "ADMIN" }))).toBe(true);
  });

  it("enforces editor and admin roles", () => {
    expect(isAuthorized("editor", makeSession({ role: "USER" }))).toBe(false);
    expect(isAuthorized("editor", makeSession({ role: "EDITOR" }))).toBe(true);
    expect(isAuthorized("editor", makeSession({ role: "ADMIN" }))).toBe(true);
    expect(isAuthorized("admin", makeSession({ role: "EDITOR" }))).toBe(false);
    expect(isAuthorized("admin", makeSession({ role: "ADMIN" }))).toBe(true);
  });
});
