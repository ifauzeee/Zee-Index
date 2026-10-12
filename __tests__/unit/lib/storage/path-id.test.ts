import { describe, expect, it } from "vitest";
import { normalizePathId } from "@/lib/storage/path-id";

describe("normalizePathId", () => {
  it.each([
    ["webdav:a/b/", "webdav:a/b"],
    ["webdav:/a//b", "webdav:a/b"],
    ["webdav:a/./b", "webdav:a/b"],
    ["webdav:public/../secret/x", "webdav:secret/x"],
    ["webdav:a\\b", "webdav:a/b"],
    ["webdav:", "webdav:"],
    ["webdav:..notes", "webdav:..notes"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizePathId(input, "webdav:")).toBe(expected);
  });

  it.each(["webdav:../x", "webdav:a/../../x", "webdav:..", "webdav:a\0b"])(
    "rejects %j",
    (input) => {
      expect(normalizePathId(input, "webdav:")).toBeNull();
    },
  );

  it("rejects ids with another prefix", () => {
    expect(normalizePathId("s3:a", "webdav:")).toBeNull();
  });
});
