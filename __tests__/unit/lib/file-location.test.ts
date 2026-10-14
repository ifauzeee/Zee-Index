import { describe, expect, it } from "vitest";
import {
  getContainingFolderIds,
  getItemHref,
  getParentFolderId,
  requiresDriveAuth,
} from "@/lib/file-location";

describe("file location", () => {
  it("uses Drive parents when present", () => {
    expect(
      getContainingFolderIds({ id: "abc", parents: ["p1", "p2"] }),
    ).toEqual(["p1", "p2"]);
  });

  it("derives the folder of a path-style id", () => {
    expect(getParentFolderId({ id: "local-storage:docs/a/b.txt" })).toBe(
      "local-storage:docs/a",
    );
    expect(getParentFolderId({ id: "webdav:song.mp3" })).toBe("webdav:");
  });

  it("returns nothing for a Drive id without parents", () => {
    expect(getParentFolderId({ id: "abc" })).toBeUndefined();
  });

  it("encodes path-style ids into single route segments", () => {
    expect(
      getItemHref({
        id: "local-storage:docs/My Report.pdf",
        name: "My Report.pdf",
        isFolder: false,
      }),
    ).toBe(
      "/folder/local-storage%3Adocs/file/local-storage%3Adocs%2FMy%20Report.pdf/my-report.pdf",
    );
    expect(
      getItemHref({
        id: "local-storage:docs/sub",
        name: "sub",
        isFolder: true,
      }),
    ).toBe("/folder/local-storage%3Adocs%2Fsub");
  });

  it("returns null when a file's folder is unknown", () => {
    expect(getItemHref({ id: "abc", name: "a", isFolder: false })).toBeNull();
  });
});

describe("requiresDriveAuth", () => {
  it("is true only for Drive folders", () => {
    expect(requiresDriveAuth("14M915id5Aj9sSSHxT-GYjdieZpR2bvru")).toBe(true);
    expect(requiresDriveAuth("local-storage:")).toBe(false);
    expect(requiresDriveAuth("local-storage:docs")).toBe(false);
    expect(requiresDriveAuth("s3:photos/")).toBe(false);
    expect(requiresDriveAuth("dropbox:")).toBe(false);
    expect(requiresDriveAuth("virtual-root")).toBe(false);
    expect(requiresDriveAuth(undefined)).toBe(false);
  });
});
