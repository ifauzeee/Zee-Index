import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response(null, { status: 200 }),
}));

const {
  mockCheckAuth,
  mockHandleAuthRedirect,
  mockCheckRateLimit,
  mockCreateRateLimitResponse,
  mockValidateApiKey,
  mockIsAppConfigured,
  mockJwtVerify,
  mockKvGet,
} = vi.hoisted(() => ({
  mockCheckAuth: vi.fn(),
  mockHandleAuthRedirect: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockCreateRateLimitResponse: vi.fn(),
  mockValidateApiKey: vi.fn(),
  mockIsAppConfigured: vi.fn(),
  mockJwtVerify: vi.fn(),
  mockKvGet: vi.fn(),
}));

vi.mock("@/lib/auth-check", () => ({
  checkAuth: mockCheckAuth,
  handleAuthRedirect: mockHandleAuthRedirect,
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockCheckRateLimit,
  createRateLimitResponse: mockCreateRateLimitResponse,
}));

vi.mock("@/lib/api-key", () => ({
  validateApiKey: mockValidateApiKey,
}));

vi.mock("@/lib/config", () => ({
  isAppConfigured: mockIsAppConfigured,
}));

vi.mock("jose", () => ({
  jwtVerify: mockJwtVerify,
}));

vi.mock("@/lib/kv", () => ({
  kv: { get: mockKvGet },
}));

import middlewareDefault, {
  createContentSecurityPolicy,
  isPublicApiPath,
} from "@/middleware";

const middleware = middlewareDefault as unknown as (
  request: NextRequest,
) => Promise<Response>;

describe("middleware public API paths", () => {
  it("lets cron routes reach their bearer-token route handler", () => {
    expect(isPublicApiPath("/api/cron/incident-monitor")).toBe(true);
    expect(isPublicApiPath("/api/cron/storage-check")).toBe(true);
  });

  it("exposes only intended public read surfaces", () => {
    expect(isPublicApiPath("/api/config/public")).toBe(true);
    expect(isPublicApiPath("/api/manual-drives")).toBe(true);
    expect(isPublicApiPath("/api/search")).toBe(true);
    expect(isPublicApiPath("/api/tags")).toBe(false);
    expect(isPublicApiPath("/api/admin/users")).toBe(false);
  });
});

describe("middleware content security policy", () => {
  it("allows embedded preview providers", () => {
    const csp = createContentSecurityPolicy("nonce-test");

    expect(csp).toContain(
      "frame-src 'self' https://accounts.google.com https://drive.google.com https://view.officeapps.live.com",
    );
  });

  it("can omit unsafe-eval for production CSP", () => {
    const csp = createContentSecurityPolicy("nonce-prod", {
      allowUnsafeEval: false,
    });
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("nonce-prod");
  });

  it("includes unsafe-eval when explicitly allowed", () => {
    const csp = createContentSecurityPolicy("nonce-dev", {
      allowUnsafeEval: true,
    });
    expect(csp).toContain("unsafe-eval");
  });
});

describe("middleware share_token flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHARE_SECRET_KEY =
      "test-share-secret-key-with-at-least-32-chars";
    process.env.NEXTAUTH_SECRET = "test-nextauth-secret-with-at-least-32-chars";
    mockIsAppConfigured.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockCreateRateLimitResponse.mockReturnValue(
      new Response("rate limited", { status: 429 }),
    );
    mockValidateApiKey.mockResolvedValue(null);
    mockKvGet.mockResolvedValue(null);
    mockJwtVerify.mockResolvedValue({
      payload: { jti: "share-1", loginRequired: false },
    });
  });

  const anonymous = () => {
    mockCheckAuth.mockResolvedValue({
      isAuthenticated: false,
      isGuest: false,
      is2FARequired: false,
      token: null,
    });
  };

  const adminPending2FA = () => {
    mockCheckAuth.mockResolvedValue({
      isAuthenticated: true,
      isGuest: false,
      is2FARequired: true,
      token: { role: "ADMIN" },
    });
  };

  it("still enforces 2FA on admin APIs when a share_token is present", async () => {
    adminPending2FA();
    const request = new NextRequest(
      "http://localhost:3000/api/admin/users?share_token=valid",
    );

    const response = await middleware(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "2FA verification required",
    });
  });

  it("redirects unauthenticated /en/admin?share_token=valid to login", async () => {
    anonymous();
    mockHandleAuthRedirect.mockImplementation(
      (_request: NextRequest, pathname: string) =>
        new Response(null, {
          status: 307,
          headers: { location: `/login?callbackUrl=${pathname}` },
        }),
    );
    const request = new NextRequest(
      "http://localhost:3000/en/admin?share_token=valid",
    );

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("lets an anonymous visitor through /en/folder/abc?share_token=valid", async () => {
    anonymous();
    const request = new NextRequest(
      "http://localhost:3000/en/folder/abc?share_token=valid",
    );

    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("lets an anonymous visitor through /en/share/jti?share_token=valid", async () => {
    anonymous();
    const request = new NextRequest(
      "http://localhost:3000/en/share/abc?share_token=valid",
    );

    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("returns 401 for an API request carrying an invalid share_token", async () => {
    anonymous();
    mockJwtVerify.mockRejectedValueOnce(new Error("invalid token"));
    const request = new NextRequest(
      "http://localhost:3000/api/admin/users?share_token=bad",
    );

    const response = await middleware(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "ShareLinkExpired",
    });
  });
});
