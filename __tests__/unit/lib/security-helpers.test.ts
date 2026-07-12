import { describe, expect, it } from "vitest";
import { constantTimeEqual } from "@/lib/security";

describe("constantTimeEqual", () => {
  it("returns true for equal strings", () => {
    expect(constantTimeEqual("secret", "secret")).toBe(true);
  });

  it("returns false for different content of same length", () => {
    expect(constantTimeEqual("secret", "secert")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(constantTimeEqual("short", "longer-value")).toBe(false);
  });
});
