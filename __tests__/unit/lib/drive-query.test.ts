import { describe, expect, it } from "vitest";
import { escapeDriveQueryValue } from "@/lib/drive/query";

describe("lib/drive/query escapeDriveQueryValue", () => {
  it("escapes single quotes with a backslash", () => {
    expect(escapeDriveQueryValue("it's")).toBe("it\\'s");
  });

  it("escapes backslashes first so they do not escape the quote", () => {
    expect(escapeDriveQueryValue("a\\b")).toBe("a\\\\b");
  });

  it("leaves a plain term untouched", () => {
    expect(escapeDriveQueryValue("report")).toBe("report");
  });

  it("handles a value that quotes and backslashes together", () => {
    expect(escapeDriveQueryValue("a\\'b")).toBe("a\\\\\\'b");
  });

  it("keeps an empty string empty", () => {
    expect(escapeDriveQueryValue("")).toBe("");
  });
});
