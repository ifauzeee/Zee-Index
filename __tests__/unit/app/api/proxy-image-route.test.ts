import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: vi.fn(() => vi.fn()),
}));

vi.mock("sharp", () => ({
  default: vi.fn(),
}));

import { isAllowedImageHost } from "@/app/api/proxy-image/route";

describe("app/api/proxy-image route", () => {
  it("accepts trusted Google image hosts and their subdomains", () => {
    expect(isAllowedImageHost("lh3.googleusercontent.com")).toBe(true);
    expect(isAllowedImageHost("foo.googleusercontent.com")).toBe(true);
  });

  it("rejects lookalike hosts that only share the suffix text", () => {
    expect(isAllowedImageHost("evilgoogleusercontent.com")).toBe(false);
    expect(isAllowedImageHost("googleusercontent.com.evil.com")).toBe(false);
  });
});
