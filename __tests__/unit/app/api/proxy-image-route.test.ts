import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: vi.fn(() => vi.fn()),
}));

vi.mock("sharp", () => ({
  default: vi.fn(),
}));

import { isAllowedImageHost, looksLikeSvg } from "@/app/api/proxy-image/route";

describe("app/api/proxy-image route", () => {
  it("accepts trusted Google image hosts and their subdomains", () => {
    expect(isAllowedImageHost("lh3.googleusercontent.com")).toBe(true);
    expect(isAllowedImageHost("foo.googleusercontent.com")).toBe(true);
  });

  it("rejects lookalike hosts that only share the suffix text", () => {
    expect(isAllowedImageHost("evilgoogleusercontent.com")).toBe(false);
    expect(isAllowedImageHost("googleusercontent.com.evil.com")).toBe(false);
  });

  it("detects SVG payloads regardless of declared content-type", () => {
    expect(
      looksLikeSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">')),
    ).toBe(true);
    expect(looksLikeSvg(Buffer.from('  \n <?xml version="1.0"?><svg/>'))).toBe(
      true,
    );
  });

  it("does not flag raster formats as SVG", () => {
    // PNG magic header
    expect(
      looksLikeSvg(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe(false);
    // JPEG magic header
    expect(looksLikeSvg(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(false);
    expect(looksLikeSvg(Buffer.from(""))).toBe(false);
  });
});
