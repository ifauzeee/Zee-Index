import { describe, expect, it, afterEach } from "vitest";
import { parsePermissions, serializePermissions } from "@/lib/api-key";

const OLD_URL = process.env.DATABASE_URL;
afterEach(() => {
  if (OLD_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = OLD_URL;
});

describe("parsePermissions", () => {
  it("passes arrays through and drops non-strings", () => {
    expect(parsePermissions(["a", 1, "b"])).toEqual(["a", "b"]);
  });
  it("parses JSON-encoded strings", () => {
    expect(parsePermissions('["files:read","download"]')).toEqual([
      "files:read",
      "download",
    ]);
  });
  it("returns [] for garbage, null, undefined, numbers", () => {
    expect(parsePermissions("not-json{{{")).toEqual([]);
    expect(parsePermissions(null)).toEqual([]);
    expect(parsePermissions(undefined)).toEqual([]);
    expect(parsePermissions(42)).toEqual([]);
    expect(parsePermissions('{"a":1}')).toEqual([]);
  });
});

describe("serializePermissions", () => {
  it("round-trips through parse on sqlite URLs", () => {
    process.env.DATABASE_URL = "file:./desktop.db";
    const perms = ["files:read", "download"];
    expect(parsePermissions(serializePermissions(perms))).toEqual(perms);
  });
  it("keeps native arrays on postgres URLs", () => {
    process.env.DATABASE_URL =
      "postgresql://u:p@localhost:5432/db?schema=public";
    expect(serializePermissions(["files:read"])).toEqual(["files:read"]);
  });
});
