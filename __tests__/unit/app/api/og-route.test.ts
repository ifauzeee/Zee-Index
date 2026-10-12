import { describe, expect, it, vi } from "vitest";

vi.mock("next/og", () => ({
  ImageResponse: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: vi.fn(() => vi.fn()),
}));

import { clampOgTitle } from "@/app/api/og/route";

describe("clampOgTitle", () => {
  it("returns the default for missing titles", () => {
    expect(clampOgTitle(null)).toBe("Zee Index");
    expect(clampOgTitle("")).toBe("Zee Index");
  });

  it("passes through titles within the limit", () => {
    expect(clampOgTitle("Short title")).toBe("Short title");
  });

  it("truncates oversized titles to 120 characters", () => {
    const longTitle = "a".repeat(500);
    const result = clampOgTitle(longTitle);
    expect(result).toHaveLength(120);
    expect(result).toBe("a".repeat(120));
  });

  it("does not split a surrogate pair at the boundary", () => {
    const result = clampOgTitle(`${"a".repeat(119)}😀tail`);
    expect(Array.from(result)).toHaveLength(120);
    expect(result.endsWith("😀")).toBe(true);
  });
});
