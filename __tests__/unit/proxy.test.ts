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
} from "@/proxy";
import { SWAGGER_UI_CDN } from "@/lib/constants";

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
    // OG images are fetched by social crawlers without a session.
    expect(isPublicApiPath("/api/og")).toBe(true);
    expect(isPublicApiPath("/api/admin/users")).toBe(false);
  });

  it("matches public API paths exactly instead of by loose prefix", () => {
    expect(isPublicApiPath("/api/files")).toBe(true);
    expect(isPublicApiPath("/api/files/delete")).toBe(false);
    expect(isPublicApiPath("/api/files/bulk-delete")).toBe(false);
    expect(isPublicApiPath("/api/search")).toBe(true);
    expect(isPublicApiPath("/api/search/global")).toBe(true);
    expect(isPublicApiPath("/api/search/index")).toBe(false);
    expect(isPublicApiPath("/api/filesX")).toBe(false);
    expect(isPublicApiPath("/api/share/items/abc")).toBe(true);
    expect(isPublicApiPath("/api/cron/storage-check")).toBe(true);
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

describe("middleware content security policy sources", () => {
  it("lists the pinned Swagger UI CDN with a trailing slash", () => {
    const csp = createContentSecurityPolicy("nonce-src");

    // Without the trailing slash CSP matches only that exact URL, not the
    // bundle and preset scripts that live beneath it.
    expect(csp).toContain(`${SWAGGER_UI_CDN}/`);
    expect(csp).toContain(
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/",
    );
  });

  it("no longer allows the pdf.js worker from a CDN", () => {
    const csp = createContentSecurityPolicy("nonce-src");

    expect(csp).not.toContain("pdfjs-dist@4");
  });

  it("does not list a pdf.js CDN in worker-src", () => {
    const csp = createContentSecurityPolicy("nonce-src");

    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).not.toContain("worker-src 'self' blob: https://");
  });

  it("allows the pinned Swagger UI CDN stylesheet in style-src", () => {
    const csp = createContentSecurityPolicy("nonce-src");

    // A quoted "${SWAGGER_UI_CDN}" would end up in the policy as a literal,
    // blocking swagger-ui.css on the docs page.
    expect(csp).toContain(
      `style-src 'self' 'unsafe-inline' blob: https://fonts.googleapis.com ${SWAGGER_UI_CDN}/`,
    );
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

  it("strips client-supplied API key headers from API requests", async () => {
    anonymous();
    const seenAuthMethod: Array<string | null> = [];
    const seenKeyId: Array<string | null> = [];
    const seenPermissions: Array<string | null> = [];
    const seenCookies: Array<string | null> = [];
    mockCheckRateLimit.mockImplementation((request: NextRequest) => {
      seenAuthMethod.push(request.headers.get("x-auth-method"));
      seenKeyId.push(request.headers.get("x-api-key-id"));
      seenPermissions.push(request.headers.get("x-api-key-permissions"));
      seenCookies.push(request.headers.get("cookie"));
      return Promise.resolve({
        success: true,
        limit: 1,
        remaining: 1,
        reset: 0,
      });
    });
    const request = new NextRequest("http://localhost:3000/api/files", {
      headers: {
        "x-auth-method": "api-key",
        "x-api-key-id": "forged",
        "x-api-key-name": "forged",
        "x-api-key-permissions": "admin:write",
        cookie: "authjs.csrf-token=legit",
      },
    });

    await middleware(request);

    expect(seenAuthMethod).toEqual([null]);
    expect(seenKeyId).toEqual([null]);
    expect(seenPermissions).toEqual([null]);
    // Stripping must only remove the forged headers: anything else (cookies
    // especially) has to reach downstream readers untouched.
    expect(seenCookies).toEqual(["authjs.csrf-token=legit"]);
  });

  it("keeps client-supplied API key headers on non-API requests", async () => {
    anonymous();
    const request = new NextRequest("http://localhost:3000/login", {
      headers: { "x-auth-method": "api-key" },
    });

    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("strips forged API key headers on the /api/download early-exit path", async () => {
    anonymous();
    const request = new NextRequest(
      "http://localhost:3000/api/download?id=file1",
      {
        headers: {
          "x-auth-method": "api-key",
          "x-api-key-id": "forged",
          "x-api-key-name": "forged",
          "x-api-key-permissions": "admin:write",
        },
      },
    );

    const response = await middleware(request);

    // applyCsp forwards the middleware's request headers; the forged copy
    // must not survive into what the route handler sees.
    expect(
      response.headers.get("x-middleware-request-x-auth-method"),
    ).toBeNull();
  });

  it("strips forged API key headers on the /api/health skip path", async () => {
    anonymous();
    const request = new NextRequest("http://localhost:3000/api/health", {
      headers: {
        "x-auth-method": "api-key",
        "x-api-key-permissions": "admin:write",
      },
    });

    const response = await middleware(request);

    const override = response.headers.get("x-middleware-override-headers");
    expect(override).not.toBeNull();
    const forwarded = override
      ? override.split(",").map((header) => header.trim())
      : [];
    expect(forwarded).not.toContain("x-auth-method");
    expect(forwarded).not.toContain("x-api-key-permissions");
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
