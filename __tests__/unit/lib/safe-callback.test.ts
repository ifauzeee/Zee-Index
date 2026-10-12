import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "@/lib/safe-callback";

describe("safeCallbackUrl", () => {
  it.each([
    ["/", "/"],
    ["/en/folder/abc?view=true", "/en/folder/abc?view=true"],
    ["/admin#logs", "/admin#logs"],
  ])("keeps same-site path %s", (input, expected) => {
    expect(safeCallbackUrl(input)).toBe(expected);
  });

  it.each([
    null,
    "",
    "https://evil.example/login",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "evil.example",
    "/\tevil",
  ])("falls back to / for %j", (input) => {
    expect(safeCallbackUrl(input)).toBe("/");
  });
});
