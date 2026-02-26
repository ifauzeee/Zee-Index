import { describe, it, expect } from "vitest";
import {
  GOOGLE_DRIVE_API_BASE_URL,
  GOOGLE_OAUTH_TOKEN_URL,
  MIME_TYPES,
  EXPORT_TYPE_MAP,
  REDIS_KEYS,
  REDIS_TTL,
  MEMORY_CACHE_KEYS,
  ERROR_MESSAGES,
  RATE_LIMITS,
} from "@/lib/constants";

describe("lib/constants", () => {
  describe("API URLs", () => {
    it("has correct Google Drive API base URL", () => {
      expect(GOOGLE_DRIVE_API_BASE_URL).toBe(
        "https://www.googleapis.com/drive/v3",
      );
    });

    it("has correct OAuth token URL", () => {
      expect(GOOGLE_OAUTH_TOKEN_URL).toBe(
        "https://oauth2.googleapis.com/token",
      );
    });
  });

  describe("MIME_TYPES", () => {
    it("has folder mime type", () => {
      expect(MIME_TYPES.FOLDER).toBe("application/vnd.google-apps.folder");
    });

    it("has shortcut mime type", () => {
      expect(MIME_TYPES.SHORTCUT).toBe("application/vnd.google-apps.shortcut");
    });

    it("has all Google workspace types", () => {
      expect(MIME_TYPES.GOOGLE_DOC).toBeDefined();
      expect(MIME_TYPES.GOOGLE_SHEET).toBeDefined();
      expect(MIME_TYPES.GOOGLE_SLIDES).toBeDefined();
      expect(MIME_TYPES.GOOGLE_DRAWING).toBeDefined();
      expect(MIME_TYPES.GOOGLE_SCRIPT).toBeDefined();
    });
  });

  describe("EXPORT_TYPE_MAP", () => {
    it("maps Google Docs to docx", () => {
      const entry = EXPORT_TYPE_MAP[MIME_TYPES.GOOGLE_DOC];
      expect(entry.ext).toBe(".docx");
      expect(entry.mime).toContain("wordprocessingml");
    });

    it("maps Google Sheets to xlsx", () => {
      const entry = EXPORT_TYPE_MAP[MIME_TYPES.GOOGLE_SHEET];
      expect(entry.ext).toBe(".xlsx");
      expect(entry.mime).toContain("spreadsheetml");
    });

    it("maps Google Slides to pptx", () => {
      const entry = EXPORT_TYPE_MAP[MIME_TYPES.GOOGLE_SLIDES];
      expect(entry.ext).toBe(".pptx");
      expect(entry.mime).toContain("presentationml");
    });

    it("maps Google Drawing to png", () => {
      const entry = EXPORT_TYPE_MAP[MIME_TYPES.GOOGLE_DRAWING];
      expect(entry.ext).toBe(".png");
      expect(entry.mime).toBe("image/png");
    });

    it("maps Google Script to json", () => {
      const entry = EXPORT_TYPE_MAP[MIME_TYPES.GOOGLE_SCRIPT];
      expect(entry.ext).toBe(".json");
    });
  });

  describe("REDIS_KEYS", () => {
    it("has all expected keys", () => {
      expect(REDIS_KEYS.ACCESS_TOKEN).toBeDefined();
      expect(REDIS_KEYS.CREDENTIALS).toBeDefined();
      expect(REDIS_KEYS.SHARE_BLOCKED).toBeDefined();
      expect(REDIS_KEYS.MANUAL_DRIVES).toBeDefined();
      expect(REDIS_KEYS.FOLDER_TREE).toBeDefined();
      expect(REDIS_KEYS.FOLDER_CONTENT).toBeDefined();
      expect(REDIS_KEYS.FILE_DETAILS).toBeDefined();
      expect(REDIS_KEYS.FOLDER_PATH).toBeDefined();
      expect(REDIS_KEYS.ADMIN_USERS).toBeDefined();
      expect(REDIS_KEYS.ADMIN_EDITORS).toBeDefined();
    });

    it("keys have consistent prefix pattern", () => {
      expect(REDIS_KEYS.CREDENTIALS).toContain("zee-index:");
      expect(REDIS_KEYS.MANUAL_DRIVES).toContain("zee-index:");
    });
  });

  describe("REDIS_TTL", () => {
    it("has reasonable TTL values (in seconds)", () => {
      expect(REDIS_TTL.ACCESS_TOKEN).toBe(3500);
      expect(REDIS_TTL.FOLDER_TREE).toBe(3600);
      expect(REDIS_TTL.FOLDER_CONTENT).toBe(3600);
      expect(REDIS_TTL.FOLDER_CONTENT_EMPTY).toBe(5);
      expect(REDIS_TTL.FILE_DETAILS).toBe(600);
      expect(REDIS_TTL.FOLDER_PATH).toBe(3600);
    });

    it("empty folder TTL is much shorter", () => {
      expect(REDIS_TTL.FOLDER_CONTENT_EMPTY).toBeLessThan(
        REDIS_TTL.FOLDER_CONTENT,
      );
    });
  });

  describe("RATE_LIMITS", () => {
    it("has API rate limits", () => {
      expect(RATE_LIMITS.API.LIMIT).toBe(500);
      expect(RATE_LIMITS.API.WINDOW).toBe(60);
    });

    it("has download rate limits", () => {
      expect(RATE_LIMITS.DOWNLOAD.LIMIT).toBe(100);
      expect(RATE_LIMITS.DOWNLOAD.WINDOW).toBe(3600);
    });

    it("auth rate limits are stricter", () => {
      expect(RATE_LIMITS.AUTH.LIMIT).toBeLessThan(RATE_LIMITS.API.LIMIT);
    });

    it("has admin rate limits", () => {
      expect(RATE_LIMITS.ADMIN.LIMIT).toBe(50);
      expect(RATE_LIMITS.ADMIN.WINDOW).toBe(60);
    });
  });

  describe("ERROR_MESSAGES", () => {
    it("has all expected error messages", () => {
      expect(ERROR_MESSAGES.INVALID_GRANT).toBeDefined();
      expect(ERROR_MESSAGES.SESSION_EXPIRED).toBeDefined();
      expect(ERROR_MESSAGES.FILE_NOT_FOUND).toBeDefined();
      expect(ERROR_MESSAGES.ACCESS_DENIED).toBeDefined();
      expect(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED).toBeDefined();
      expect(ERROR_MESSAGES.INTERNAL_SERVER_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.MISSING_FILE_ID).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_FILE_ID).toBeDefined();
    });

    it("error messages are non-empty strings", () => {
      Object.values(ERROR_MESSAGES).forEach((msg) => {
        expect(typeof msg).toBe("string");
        expect(msg.length).toBeGreaterThan(0);
      });
    });
  });

  describe("MEMORY_CACHE_KEYS", () => {
    it("has folder content key", () => {
      expect(MEMORY_CACHE_KEYS.FOLDER_CONTENT).toBe("drive:folder:");
    });

    it("has file details key", () => {
      expect(MEMORY_CACHE_KEYS.FILE_DETAILS).toBe("drive:file:");
    });
  });
});
