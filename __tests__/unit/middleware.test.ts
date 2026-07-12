import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response(null, { status: 200 }),
}));

import { createContentSecurityPolicy, isPublicApiPath } from "@/middleware";

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
