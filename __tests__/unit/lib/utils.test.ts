import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  formatBytes,
  formatDuration,
  getFileType,
  getGoogleDriveLink,
  getGoogleEditorLink,
  getLanguageFromFilename,
  hexToHsl,
  getIcon,
  getPrivateFolderIds,
  cleanMediaTitle,
  getBaseUrl,
} from "@/lib/utils";
import {
  File as FileIcon,
  Image,
  Video,
  Music,
  Archive,
  Folder,
  FileText,
  Sheet,
  Presentation,
} from "lucide-react";

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

    it("formats large sizes", () => {
      expect(formatBytes(1073741824)).toBe("1 GB");
      expect(formatBytes(1099511627776)).toBe("1 TB");
    });

    it("handles custom decimal places", () => {
      expect(formatBytes(1234, 0)).toBe("1 KB");
      expect(formatBytes(1234, 3)).toBe("1.205 KB");
    });

    it("handles negative decimals gracefully", () => {
      expect(formatBytes(1024, -1)).toBe("1 KB");
    });

    it("handles NaN and special values", () => {
      expect(formatBytes(NaN)).toBe("0 Bytes");
    });
  });

  describe("formatDuration", () => {
    it("formats zero seconds", () => {
      expect(formatDuration(0)).toBe("00:00");
    });

    it("formats seconds", () => {
      expect(formatDuration(45)).toBe("00:45");
    });

    it("formats minutes", () => {
      expect(formatDuration(125)).toBe("02:05");
    });

    it("formats hours", () => {
      expect(formatDuration(3665)).toBe("01:01:05");
    });

    it("handles string input", () => {
      expect(formatDuration("90")).toBe("01:30");
    });

    it("handles invalid inputs", () => {
      expect(formatDuration(-1)).toBe("00:00");
      expect(formatDuration("abc")).toBe("00:00");
      expect(formatDuration(NaN)).toBe("00:00");
    });

    it("handles large durations", () => {
      expect(formatDuration(86400)).toBe("24:00:00");
    });
  });

  describe("getFileType", () => {
    it("identifies videos", () => {
      expect(getFileType({ mimeType: "video/mp4", name: "movie.mp4" })).toBe(
        "video",
      );
      expect(getFileType({ mimeType: "video/webm", name: "clip.webm" })).toBe(
        "video",
      );
    });

    it("identifies audio", () => {
      expect(getFileType({ mimeType: "audio/mpeg", name: "song.mp3" })).toBe(
        "audio",
      );
    });

    it("identifies images", () => {
      expect(getFileType({ mimeType: "image/jpeg", name: "photo.jpg" })).toBe(
        "image",
      );
      expect(getFileType({ mimeType: "image/png", name: "icon.png" })).toBe(
        "image",
      );
    });

    it("identifies pdfs", () => {
      expect(
        getFileType({ mimeType: "application/pdf", name: "doc.pdf" }),
      ).toBe("pdf");
    });

    it("identifies markdown", () => {
      expect(
        getFileType({ mimeType: "text/markdown", name: "readme.md" }),
      ).toBe("markdown");
      expect(getFileType({ mimeType: "", name: "notes.md" })).toBe("markdown");
    });

    it("identifies text files", () => {
      expect(getFileType({ mimeType: "text/plain", name: "readme.txt" })).toBe(
        "text",
      );
    });

    it("identifies archives", () => {
      expect(
        getFileType({ mimeType: "application/zip", name: "bundle.zip" }),
      ).toBe("archive");
      expect(getFileType({ mimeType: "", name: "data.rar" })).toBe("archive");
      expect(getFileType({ mimeType: "", name: "data.7z" })).toBe("archive");
    });

    it("identifies office documents", () => {
      expect(
        getFileType({
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          name: "doc.docx",
        }),
      ).toBe("office");
      expect(
        getFileType({
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          name: "sheet.xlsx",
        }),
      ).toBe("office");
      expect(
        getFileType({
          mimeType:
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          name: "slides.pptx",
        }),
      ).toBe("office");
    });

    it("identifies ebooks", () => {
      expect(
        getFileType({ mimeType: "application/epub+zip", name: "book.epub" }),
      ).toBe("ebook");
    });

    it("identifies code files by extension", () => {
      const codeExts = [
        "js",
        "ts",
        "jsx",
        "tsx",
        "json",
        "py",
        "css",
        "html",
        "sh",
        "java",
        "c",
        "cpp",
        "cs",
        "go",
        "rb",
        "php",
        "swift",
        "kt",
        "rs",
      ];
      for (const ext of codeExts) {
        expect(getFileType({ mimeType: "", name: `file.${ext}` })).toBe("code");
      }
    });

    it("defaults to other for unknown types", () => {
      expect(
        getFileType({ mimeType: "application/unknown", name: "mystery.xyz" }),
      ).toBe("other");
    });
  });

  describe("getGoogleDriveLink", () => {
    it("generates correct view link", () => {
      expect(getGoogleDriveLink("12345")).toBe(
        "https://drive.google.com/file/d/12345/view",
      );
    });

    it("handles special characters in ID", () => {
      expect(getGoogleDriveLink("abc-def_123")).toBe(
        "https://drive.google.com/file/d/abc-def_123/view",
      );
    });
  });

  describe("getGoogleEditorLink", () => {
    it("generates doc edit link for Google Docs", () => {
      expect(
        getGoogleEditorLink("123", "application/vnd.google-apps.document"),
      ).toBe("https://docs.google.com/document/d/123/edit");
    });

    it("generates doc edit link for word docs", () => {
      expect(
        getGoogleEditorLink(
          "123",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ).toBe("https://docs.google.com/document/d/123/edit");
    });

    it("generates sheet edit link", () => {
      expect(
        getGoogleEditorLink("456", "application/vnd.google-apps.spreadsheet"),
      ).toBe("https://docs.google.com/spreadsheets/d/456/edit");
    });

    it("generates presentation edit link", () => {
      expect(
        getGoogleEditorLink("789", "application/vnd.google-apps.presentation"),
      ).toBe("https://docs.google.com/presentation/d/789/edit");
    });

    it("returns null for non-editable files", () => {
      expect(getGoogleEditorLink("789", "video/mp4")).toBeNull();
      expect(getGoogleEditorLink("789", "image/png")).toBeNull();
      expect(getGoogleEditorLink("789", "application/pdf")).toBeNull();
    });
  });

  describe("getLanguageFromFilename", () => {
    it("maps common extensions", () => {
      expect(getLanguageFromFilename("app.js")).toBe("javascript");
      expect(getLanguageFromFilename("app.ts")).toBe("typescript");
      expect(getLanguageFromFilename("app.py")).toBe("python");
      expect(getLanguageFromFilename("app.jsx")).toBe("jsx");
      expect(getLanguageFromFilename("app.tsx")).toBe("tsx");
      expect(getLanguageFromFilename("style.css")).toBe("css");
      expect(getLanguageFromFilename("page.html")).toBe("html");
      expect(getLanguageFromFilename("config.json")).toBe("json");
      expect(getLanguageFromFilename("readme.md")).toBe("markdown");
      expect(getLanguageFromFilename("script.sh")).toBe("bash");
    });

    it("maps less common languages", () => {
      expect(getLanguageFromFilename("Main.java")).toBe("java");
      expect(getLanguageFromFilename("main.go")).toBe("go");
      expect(getLanguageFromFilename("app.rb")).toBe("ruby");
      expect(getLanguageFromFilename("index.php")).toBe("php");
      expect(getLanguageFromFilename("main.rs")).toBe("rust");
      expect(getLanguageFromFilename("app.kt")).toBe("kotlin");
      expect(getLanguageFromFilename("main.swift")).toBe("swift");
      expect(getLanguageFromFilename("Program.cs")).toBe("csharp");
      expect(getLanguageFromFilename("main.c")).toBe("c");
      expect(getLanguageFromFilename("main.cpp")).toBe("cpp");
    });

    it("defaults to clike for unknown extensions", () => {
      expect(getLanguageFromFilename("file.xyz")).toBe("clike");
      expect(getLanguageFromFilename("noext")).toBe("clike");
    });
  });

  describe("getIcon", () => {
    it("returns folder icon", () => {
      expect(getIcon("application/vnd.google-apps.folder")).toBe(Folder);
    });

    it("returns image icon", () => {
      expect(getIcon("image/png")).toBe(Image);
      expect(getIcon("image/jpeg")).toBe(Image);
    });

    it("returns video icon", () => {
      expect(getIcon("video/mp4")).toBe(Video);
    });

    it("returns music icon", () => {
      expect(getIcon("audio/mpeg")).toBe(Music);
    });

    it("returns archive icon", () => {
      expect(getIcon("application/zip")).toBe(Archive);
      expect(getIcon("application/x-rar-compressed")).toBe(Archive);
      expect(getIcon("application/x-7z-compressed")).toBe(Archive);
      expect(getIcon("application/x-tar")).toBe(Archive);
    });

    it("returns text icon for documents", () => {
      expect(getIcon("text/plain")).toBe(FileText);
      expect(getIcon("text/markdown")).toBe(FileText);
    });

    it("returns sheet icon", () => {
      expect(getIcon("application/vnd.google-apps.spreadsheet")).toBe(Sheet);
    });

    it("returns presentation icon", () => {
      expect(getIcon("application/vnd.google-apps.presentation")).toBe(
        Presentation,
      );
    });

    it("returns default file icon for unknown types", () => {
      expect(getIcon("unknown/type")).toBe(FileIcon);
    });

    it("handles non-string input", () => {
      expect(getIcon(undefined as any)).toBe(FileIcon);
      expect(getIcon(null as any)).toBe(FileIcon);
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
      expect(hexToHsl("#ff0000")).toMatch(/0\.0 100\.0% 50\.0%/);
    });

    it("converts green", () => {
      expect(hexToHsl("#00ff00")).toMatch(/120\.0 100\.0% 50\.0%/);
    });

    it("converts blue", () => {
      expect(hexToHsl("#0000ff")).toMatch(/240\.0 100\.0% 50\.0%/);
    });

    it("handles shorthand hex (3 chars)", () => {
      const result = hexToHsl("#fff");
      expect(result).toBe("0.0 0.0% 100.0%");
    });
  });

  describe("getPrivateFolderIds", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it("returns empty array when env var is not set", () => {
      delete process.env.PRIVATE_FOLDER_IDS;
      expect(getPrivateFolderIds()).toEqual([]);
    });

    it("parses JSON array format", () => {
      process.env.PRIVATE_FOLDER_IDS = '["id1","id2","id3"]';
      expect(getPrivateFolderIds()).toEqual(["id1", "id2", "id3"]);
    });

    it("parses comma-separated format", () => {
      process.env.PRIVATE_FOLDER_IDS = "id1,id2,id3";
      expect(getPrivateFolderIds()).toEqual(["id1", "id2", "id3"]);
    });

    it("trims whitespace in comma-separated format", () => {
      process.env.PRIVATE_FOLDER_IDS = " id1 , id2 , id3 ";
      expect(getPrivateFolderIds()).toEqual(["id1", "id2", "id3"]);
    });

    it("filters empty strings", () => {
      process.env.PRIVATE_FOLDER_IDS = "id1,,id2,";
      expect(getPrivateFolderIds()).toEqual(["id1", "id2"]);
    });

    it("handles malformed JSON gracefully", () => {
      process.env.PRIVATE_FOLDER_IDS = "[invalid json";
      expect(getPrivateFolderIds()).toEqual([]);
    });
  });

  describe("cleanMediaTitle", () => {
    it("extracts title and year from filename", () => {
      const result = cleanMediaTitle("The.Matrix.1999.1080p.BluRay.x264.mkv");
      expect(result.title).toBe("The Matrix");
      expect(result.year).toBe("1999");
    });

    it("handles parenthesized year", () => {
      const result = cleanMediaTitle("Inception (2010) 720p.mp4");
      expect(result.title).toBeTruthy();
      expect(result.year).toBe("2010");
    });

    it("handles filenames without year", () => {
      const result = cleanMediaTitle("documentary.about.space.mkv");
      expect(result.title).toBeTruthy();
      expect(result.year).toBeUndefined();
    });

    it("strips video quality indicators", () => {
      const result = cleanMediaTitle("Movie.2020.2160p.WEB-DL.x265.DTS.mkv");
      expect(result.title).toBe("Movie");
      expect(result.year).toBe("2020");
    });

    it("returns original filename if cleaning empties the title", () => {
      const result = cleanMediaTitle("1080p.mkv");
      expect(result.title).toBeTruthy();
    });
  });

  describe("getBaseUrl", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it("returns NEXTAUTH_URL when set (server-side)", () => {
      process.env.NEXTAUTH_URL = "https://example.com/";
      const result = getBaseUrl();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("strips trailing slash from NEXTAUTH_URL (server-side)", () => {
      process.env.NEXTAUTH_URL = "https://example.com/";
      const result = getBaseUrl();
      expect(result.endsWith("/")).toBe(false);
    });

    it("returns localhost when no env var is set", () => {
      delete process.env.NEXTAUTH_URL;
      expect(getBaseUrl()).toBe("http://localhost:3000");
    });
  });
});
