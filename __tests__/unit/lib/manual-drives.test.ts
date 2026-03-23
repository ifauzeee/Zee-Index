import { describe, expect, it } from "vitest";
import {
  parseManualDriveRecords,
  parseManualDrivesFromEnv,
} from "@/lib/manual-drives";

describe("lib/manual-drives", () => {
  it("normalizes stored manual drive records and drops invalid entries", () => {
    const result = parseManualDriveRecords([
      { id: "drive_1", name: "Drive One", isProtected: true },
      { id: "", name: "Broken Drive" },
      "invalid",
    ]);

    expect(result).toEqual([
      { id: "drive_1", name: "Drive One", isProtected: true },
    ]);
  });

  it("parses JSON-based manual drive env config", () => {
    const result = parseManualDrivesFromEnv(
      JSON.stringify([
        { id: "drive_json", name: "JSON Drive" },
        "drive_fallback",
      ]),
    );

    expect(result).toEqual([
      { id: "drive_json", name: "JSON Drive" },
      { id: "drive_fallback", name: "drive_fallback" },
    ]);
  });

  it("parses comma-separated manual drive env config", () => {
    const result = parseManualDrivesFromEnv("drive_a:Drive A,drive_b:Drive B");

    expect(result).toEqual([
      { id: "drive_a", name: "Drive A" },
      { id: "drive_b", name: "Drive B" },
    ]);
  });
});
