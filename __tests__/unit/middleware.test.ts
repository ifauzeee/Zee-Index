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
});

describe("middleware content security policy", () => {
  it("allows embedded preview providers", () => {
    const csp = createContentSecurityPolicy("nonce-test");

    expect(csp).toContain(
      "frame-src 'self' https://accounts.google.com https://drive.google.com https://view.officeapps.live.com",
    );
  });
});
