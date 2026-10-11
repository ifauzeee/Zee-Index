import path from "path";
import { describe, expect, it } from "vitest";
import {
  LOCAL_ROOT,
  isPathInsideLocalRoot,
  normalizeLocalStorageId,
  getLocalChunkTempKey,
  assertValidLocalChunkRange,
} from "@/lib/storage/local";
import { FILE_REQUEST_MAX_BYTES } from "@/lib/constants";

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

  describe("local upload chunking", () => {
    it("derives distinct temp keys for different uploads", () => {
      expect(getLocalChunkTempKey("folder-a", "file.txt")).not.toBe(
        getLocalChunkTempKey("folder-b", "file.txt"),
      );
    });

    it("derives the same temp key for a retried chunk", () => {
      expect(getLocalChunkTempKey("folder-a", "file.txt")).toBe(
        getLocalChunkTempKey("folder-a", "file.txt"),
      );
    });

    it("accepts the first chunk", () => {
      expect(() =>
        assertValidLocalChunkRange(0, 99, 100, 0, 100),
      ).not.toThrow();
    });

    it("rejects a chunk that leaves a gap", () => {
      // 60 bytes are expected but only 20 are on disk yet
      expect(() => assertValidLocalChunkRange(60, 79, 100, 20, 20)).toThrow(
        "Content-Range tidak valid",
      );
    });

    it("accepts a retried chunk with the same start", () => {
      expect(() =>
        assertValidLocalChunkRange(20, 39, 100, 20, 20),
      ).not.toThrow();
    });

    it("rejects total larger than the file-request cap", () => {
      expect(() =>
        assertValidLocalChunkRange(0, 99, FILE_REQUEST_MAX_BYTES + 1, 0, 100),
      ).toThrow("Content-Range tidak valid");
    });

    it("rejects body length that does not match the range", () => {
      expect(() => assertValidLocalChunkRange(0, 19, 100, 0, 10)).toThrow(
        "Content-Range tidak valid",
      );
    });

    it("rejects an inverted range", () => {
      expect(() => assertValidLocalChunkRange(50, 40, 100, 50, 0)).toThrow(
        "Content-Range tidak valid",
      );
    });

    it("rejects an end offset past the total", () => {
      expect(() => assertValidLocalChunkRange(0, 100, 100, 0, 101)).toThrow(
        "Content-Range tidak valid",
      );
    });
  });
});
