import path from "path";
import { describe, expect, it } from "vitest";
import {
  LOCAL_ROOT,
  isPathInsideLocalRoot,
  normalizeLocalStorageId,
} from "@/lib/storage/local";

describe("lib/storage/local", () => {
  it("accepts files that stay inside the local storage root", () => {
    const safePath = path.join(LOCAL_ROOT, "folder", "file.txt");

    expect(isPathInsideLocalRoot(safePath)).toBe(true);
  });

  it("rejects sibling paths that only share the same prefix", () => {
    const escapedPath = path.join(`${LOCAL_ROOT}-escape`, "secret.txt");

    expect(isPathInsideLocalRoot(escapedPath)).toBe(false);
  });

  it("rejects parent-directory traversal outside the root", () => {
    const escapedPath = path.resolve(LOCAL_ROOT, "..", "secret.txt");

    expect(isPathInsideLocalRoot(escapedPath)).toBe(false);
  });

  describe("normalizeLocalStorageId", () => {
    it("collapses `..` segments to a path that stays inside the root", () => {
      expect(normalizeLocalStorageId("local-storage:a/../b/c.txt")).toBe(
        "local-storage:b/c.txt",
      );
    });

    it("returns null when the id escapes the local storage root", () => {
      expect(normalizeLocalStorageId("local-storage:../etc")).toBeNull();
    });

    it("returns an empty path for the bare prefix", () => {
      expect(normalizeLocalStorageId("local-storage:")).toBe("local-storage:");
    });

    it("treats `.` as the local storage root", () => {
      expect(normalizeLocalStorageId("local-storage:.")).toBe("local-storage:");
    });

    it("strips surrounding slashes", () => {
      expect(normalizeLocalStorageId("local-storage:/a/b/")).toBe(
        "local-storage:a/b",
      );
    });

    it("normalizes windows separators", () => {
      expect(normalizeLocalStorageId("local-storage:a\\b\\c.txt")).toBe(
        "local-storage:a/b/c.txt",
      );
    });

    it("returns null for a NUL byte", () => {
      expect(normalizeLocalStorageId("local-storage:a\0b")).toBeNull();
    });

    it("leaves an already-canonical id unchanged", () => {
      expect(normalizeLocalStorageId("local-storage:public/a.txt")).toBe(
        "local-storage:public/a.txt",
      );
    });

    it("returns null for an id without the local storage prefix", () => {
      expect(normalizeLocalStorageId("s3:bucket/a.txt")).toBeNull();
    });
  });
});
