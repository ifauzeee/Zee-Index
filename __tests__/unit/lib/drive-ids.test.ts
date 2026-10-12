import { describe, expect, it } from "vitest";
import {
  assertDriveId,
  driveIdSchema,
  InvalidDriveIdError,
  isDriveId,
} from "@/lib/drive/ids";

describe("lib/drive/ids", () => {
  it.each(["1AbC-xyz_0123456789", "0AFxyzPVA", "root", "a".repeat(128)])(
    "accepts %s",
    (id) => {
      expect(isDriveId(id)).toBe(true);
      expect(driveIdSchema.safeParse(id).success).toBe(true);
    },
  );

  // Each of these would change the Drive URL or query it is interpolated
  // into: a quote closes the `'<id>' in parents` string, `?`/`&` add query
  // parameters, `/` switches the endpoint.
  it.each([
    "root' in parents or trashed=false or '",
    "abc?supportsAllDrives=true",
    "abc&addParents=x",
    "abc/permissions",
    "abc%2F..",
    "",
    "a".repeat(129),
    "local-storage:docs",
  ])("rejects %j", (id) => {
    expect(isDriveId(id)).toBe(false);
    expect(driveIdSchema.safeParse(id).success).toBe(false);
    expect(() => assertDriveId(id)).toThrow(InvalidDriveIdError);
  });

  it("rejects non-strings", () => {
    expect(isDriveId(undefined)).toBe(false);
    expect(isDriveId(42)).toBe(false);
  });
});
