import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import {
  createAdminRoute,
  createEditorRoute,
  createPublicRoute,
  createUserRoute,
  isAuthorized,
} from "@/lib/api-middleware";

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

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

function makeRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

function pendingSession(): Session {
  return makeSession({ role: "ADMIN", twoFactorRequired: true });
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

describe("createRouteHandler 2FA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
  });

  it("returns 403 for admin route when 2FA is pending", async () => {
    mockAuth.mockResolvedValue(pendingSession());

    const response = await createAdminRoute(async () =>
      NextResponse.json({ ok: true }),
    )(makeRequest("/api/admin/users"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "2FA verification required",
    });
  });

  it("returns 403 for user route when 2FA is pending", async () => {
    mockAuth.mockResolvedValue(pendingSession());

    const response = await createUserRoute(async () =>
      NextResponse.json({ ok: true }),
    )(makeRequest("/api/auth/me"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "2FA verification required",
    });
  });

  it("returns 403 for editor route when 2FA is pending", async () => {
    mockAuth.mockResolvedValue(pendingSession());

    const response = await createEditorRoute(async () =>
      NextResponse.json({ ok: true }),
    )(makeRequest("/api/files/upload"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "2FA verification required",
    });
  });

  it("carries the request id on the 2FA rejection", async () => {
    mockAuth.mockResolvedValue(pendingSession());

    const request = makeRequest("/api/admin/users");
    request.headers.set("x-request-id", "req-2fa");

    const response = await createAdminRoute(async () =>
      NextResponse.json({ ok: true }),
    )(request);

    expect(response.headers.get("X-Request-Id")).toBe("req-2fa");
  });

  it("passes session=null to public routes when 2FA is pending", async () => {
    mockAuth.mockResolvedValue(pendingSession());

    let received: Session | null | undefined;
    const response = await createPublicRoute(
      async ({ session }) => {
        received = session;
        return NextResponse.json({ ok: true });
      },
      { includeSession: true },
    )(makeRequest("/api/config/public"));

    expect(response.status).toBe(200);
    expect(received).toBeNull();
  });

  it("allows pending session when allowPending2FA is set", async () => {
    mockAuth.mockResolvedValue(pendingSession());

    const response = await createUserRoute(
      async ({ session }) => NextResponse.json({ email: session.user.email }),
      { allowPending2FA: true },
    )(makeRequest("/api/auth/2fa/verify-login"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: "user@example.com" });
  });

  it("lets a verified session through", async () => {
    mockAuth.mockResolvedValue(
      makeSession({ role: "ADMIN", twoFactorRequired: false }),
    );

    const response = await createAdminRoute(async () =>
      NextResponse.json({ ok: true }),
    )(makeRequest("/api/admin/users"));

    expect(response.status).toBe(200);
  });

  it("still rejects unauthenticated non-public routes with 401", async () => {
    const response = await createUserRoute(async () =>
      NextResponse.json({ ok: true }),
    )(makeRequest("/api/auth/me"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("does not load a session for public routes without includeSession", async () => {
    const response = await createPublicRoute(async () =>
      NextResponse.json({ ok: true }),
    )(makeRequest("/api/health"));

    expect(response.status).toBe(200);
    expect(mockAuth).not.toHaveBeenCalled();
  });
});
