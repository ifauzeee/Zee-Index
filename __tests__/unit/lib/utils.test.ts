import { describe, it, expect } from "vitest";
import {
  formatBytes,
  formatDuration,
  getFileType,
  getGoogleDriveLink,
  getGoogleEditorLink,
  hexToHsl,
  getIcon,
} from "@/lib/utils";
import { File as FileIcon, Image, Video } from "lucide-react";

describe("lib/utils", () => {
  describe("formatBytes", () => {
    it("formats 0 bytes", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
    });

    it("formats bytes correctly", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1234)).toBe("1.21 KB");
      expect(formatBytes(1048576)).toBe("1 MB");
    });

    it("handles negative decimals gracefully", () => {
      expect(formatBytes(1024, -1)).toBe("1 KB");
    });
  });

  describe("formatDuration", () => {
    it("formats seconds", () => {
      expect(formatDuration(45)).toBe("00:45");
    });

    it("formats minutes", () => {
      expect(formatDuration(125)).toBe("02:05");
    });

    it("formats hours", () => {
      expect(formatDuration(3665)).toBe("01:01:05");
    });

    it("handles invalid inputs", () => {
      expect(formatDuration(-1)).toBe("00:00");
      expect(formatDuration("abc")).toBe("00:00");
    });
  });

  describe("getFileType", () => {
    it("identifies videos", () => {
      expect(getFileType({ mimeType: "video/mp4", name: "movie.mp4" })).toBe(
        "video",
      );
    });

    it("identifies images", () => {
      expect(getFileType({ mimeType: "image/jpeg", name: "photo.jpg" })).toBe(
        "image",
      );
    });

    it("identifies code files by extension", () => {
      expect(
        getFileType({ mimeType: "application/python", name: "script.py" }),
      ).toBe("code");
      expect(getFileType({ mimeType: "", name: "app.tsx" })).toBe("code");
    });

    it("identifies pdfs", () => {
      expect(
        getFileType({ mimeType: "application/pdf", name: "doc.pdf" }),
      ).toBe("pdf");
    });

    it("defaults to other", () => {
      expect(
        getFileType({ mimeType: "application/unknown", name: "unknown.xyz" }),
      ).toBe("other");
    });
  });

  describe("getGoogleDriveLink", () => {
    it("generates correct view link", () => {
      expect(getGoogleDriveLink("12345")).toBe(
        "https://drive.google.com/file/d/12345/view",
      );
    });
  });

  describe("getGoogleEditorLink", () => {
    it("generates doc edit link", () => {
      expect(
        getGoogleEditorLink("123", "application/vnd.google-apps.document"),
      ).toBe("https://docs.google.com/document/d/123/edit");
    });

    it("generates sheet edit link", () => {
      expect(
        getGoogleEditorLink("456", "application/vnd.google-apps.spreadsheet"),
      ).toBe("https://docs.google.com/spreadsheets/d/456/edit");
    });

    it("returns null for non-editable files", () => {
      expect(getGoogleEditorLink("789", "video/mp4")).toBeNull();
    });
  });

  describe("getIcon", () => {
    it("returns correct icon component for mime types", () => {
      expect(getIcon("image/png")).toBe(Image);
      expect(getIcon("video/mp4")).toBe(Video);
      expect(getIcon("unknown/type")).toBe(FileIcon);
    });
  });

  describe("hexToHsl", () => {
    it("converts black", () => {
      expect(hexToHsl("#000000")).toBe("0.0 0.0% 0.0%");
    });

    it("converts white", () => {
      expect(hexToHsl("#ffffff")).toBe("0.0 0.0% 100.0%");
    });

    it("converts red", () => {
      const result = hexToHsl("#ff0000");
      expect(result).toMatch(/0\.0 100\.0% 50\.0%/);
    });
  });
});
