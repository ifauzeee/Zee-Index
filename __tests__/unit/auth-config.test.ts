import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";

const mocks = vi.hoisted(() => ({
  getSessionVersion: vi.fn(),
  authLimiterCheck: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  sismember: vi.fn(),
  getPasswordHash: vi.fn(),
  getTwoFactorState: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: () => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  }),
}));
vi.mock("next-auth/providers/google", () => ({
  default: (options: object) => ({ id: "google", ...options }),
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: (options: object) => options,
}));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.findUnique,
      create: mocks.create,
      update: mocks.update,
    },
  },
}));
vi.mock("@/lib/kv", () => ({
  kv: { sismember: mocks.sismember, get: vi.fn(), del: vi.fn() },
}));
vi.mock("@/lib/ratelimit", () => ({
  authLimiter: { check: mocks.authLimiterCheck },
}));
vi.mock("@/lib/session-version", () => ({
  getSessionVersion: mocks.getSessionVersion,
}));
vi.mock("@/lib/credentials", () => ({
  getPasswordHash: mocks.getPasswordHash,
  getTwoFactorState: mocks.getTwoFactorState,
}));
vi.mock("@/lib/app-config", () => ({
  getPublicAppConfig: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/activityLogger", () => ({ logActivity: vi.fn() }));

import { authConfig } from "@/auth";

type JwtCallback = (params: { token: JWT }) => Promise<JWT | null>;
const jwt = authConfig.callbacks!.jwt as unknown as JwtCallback;

type Authorize = (
  credentials: Record<string, string>,
  req: Request,
) => Promise<unknown>;
const credentialsProvider = authConfig.providers.find(
  (p) => (p as { id?: string }).id === "credentials",
) as unknown as { authorize: Authorize };

function loginRequest(): Request {
  return new Request("http://localhost/api/auth/callback/credentials", {
    headers: { "x-forwarded-for": "203.0.113.9" },
  });
}

describe("jwt callback session revocation (Z2-06)", () => {
  beforeEach(() => vi.clearAllMocks());

  const token: JWT = {
    email: "user@example.com",
    role: "ADMIN",
    sessionVersion: 2,
  };

  it("keeps a token whose version is current", async () => {
    mocks.getSessionVersion.mockResolvedValue(2);

    expect(await jwt({ token: { ...token } })).toMatchObject({
      email: "user@example.com",
    });
  });

  it("signs out a token issued before the sessions were revoked", async () => {
    mocks.getSessionVersion.mockResolvedValue(3);

    expect(await jwt({ token: { ...token } })).toBeNull();
  });

  it("signs out a token for a user that no longer exists", async () => {
    mocks.getSessionVersion.mockResolvedValue(null);

    expect(await jwt({ token: { ...token } })).toBeNull();
  });

  it("treats tokens from before this change as version 0", async () => {
    mocks.getSessionVersion.mockResolvedValue(0);

    expect(
      await jwt({ token: { email: "user@example.com", role: "USER" } }),
    ).not.toBeNull();
  });

  it("does not sign everyone out on a database error", async () => {
    mocks.getSessionVersion.mockRejectedValue(new Error("db down"));

    expect(await jwt({ token: { ...token } })).not.toBeNull();
  });

  it("skips the check for guests", async () => {
    expect(
      await jwt({
        token: { email: "guest_1@guest.local", isGuest: true, role: "GUEST" },
      }),
    ).not.toBeNull();
    expect(mocks.getSessionVersion).not.toHaveBeenCalled();
  });
});

describe("credentials authorize (Z2-16)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAILS = "owner@example.com";
    process.env.ADMIN_PASSWORD = "env-admin-password";
    delete process.env.ADMIN_PASSWORD_HASH;
    mocks.authLimiterCheck.mockResolvedValue({ success: true });
    mocks.sismember.mockResolvedValue(0);
    mocks.getPasswordHash.mockResolvedValue(null);
    mocks.getTwoFactorState.mockResolvedValue({ enabled: false, secret: null });
  });

  it("accepts the env password for an env-listed admin", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "u1",
      email: "owner@example.com",
      role: "ADMIN",
      name: "owner",
    });

    const user = await credentialsProvider.authorize(
      { email: "owner@example.com", password: "env-admin-password" },
      loginRequest(),
    );

    expect(user).toMatchObject({ email: "owner@example.com", role: "ADMIN" });
  });

  it("rejects the env password for an admin added in the panel", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "u2",
      email: "panel-admin@example.com",
      role: "ADMIN",
      name: "panel-admin",
    });

    const user = await credentialsProvider.authorize(
      { email: "panel-admin@example.com", password: "env-admin-password" },
      loginRequest(),
    );

    expect(user).toBeNull();
  });

  it("limits attempts per account as well as per IP", async () => {
    mocks.authLimiterCheck.mockImplementation(async (id: string) => ({
      success: !id.startsWith("login:"),
    }));

    await expect(
      credentialsProvider.authorize(
        { email: "Owner@Example.com", password: "x" },
        loginRequest(),
      ),
    ).rejects.toThrow("Too many login attempts");
    expect(mocks.authLimiterCheck).toHaveBeenCalledWith("203.0.113.9");
    expect(mocks.authLimiterCheck).toHaveBeenCalledWith(
      "login:owner@example.com",
    );
  });
});
