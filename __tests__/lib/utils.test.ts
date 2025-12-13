import { describe, it, expect } from "vitest";
import { formatBytes, formatDuration, getFileType } from "@/lib/utils";

describe("formatBytes", () => {
  it("formats 0 bytes correctly", () => {
    expect(formatBytes(0)).toBe("0 Bytes");
  });

  it("formats bytes correctly", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1234)).toBe("1.21 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
  });

  it("handles negative decimals", () => {
    expect(formatBytes(1234, -1)).toBe("1 KB");
  });
});

describe("formatDuration", () => {
  it("formats seconds correctly", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(61)).toBe("01:01");
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("handles invalid input", () => {
    expect(formatDuration(-1)).toBe("00:00");
    expect(formatDuration("abc")).toBe("00:00");
  });
});

describe("getFileType", () => {
  it("identifies file types correctly", () => {
    expect(getFileType({ mimeType: "image/jpeg", name: "test.jpg" })).toBe(
      "image",
    );
    expect(getFileType({ mimeType: "application/pdf", name: "test.pdf" })).toBe(
      "pdf",
    );
    expect(
      getFileType({
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        name: "doc.docx",
      }),
    ).toBe("office");
    expect(getFileType({ mimeType: "", name: "script.ts" })).toBe("code");
  });
});
