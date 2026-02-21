import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    activityLog: {
      create: vi
        .fn()
        .mockImplementation((args) =>
          Promise.resolve({ id: "mock-id", ...args.data }),
        ),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockImplementation((key: string) => {
      if (key === "x-forwarded-for") return "192.168.1.1";
      if (key === "user-agent") return "TestAgent/1.0";
      return null;
    }),
  }),
}));

import {
  logActivity,
  getActivityLogs,
  getActivityStats,
  type ActivityType,
} from "@/lib/activityLogger";
import { db } from "@/lib/db";

describe("activityLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logActivity", () => {
    it("logs a basic activity", async () => {
      const result = await logActivity("UPLOAD", {
        itemName: "test.pdf",
        userEmail: "user@example.com",
      });

      expect(result).toBeDefined();
      expect(result?.type).toBe("UPLOAD");
      expect(result?.itemName).toBe("test.pdf");
      expect(result?.severity).toBe("info");
      expect(db.activityLog.create).toHaveBeenCalled();
    });

    it("assigns correct severity levels", async () => {
      const testCases: { type: ActivityType; expectedSeverity: string }[] = [
        { type: "UPLOAD", expectedSeverity: "info" },
        { type: "DELETE", expectedSeverity: "warning" },
        { type: "LOGIN_FAILURE", expectedSeverity: "error" },
        { type: "ADMIN_ADDED", expectedSeverity: "critical" },
      ];

      for (const { type, expectedSeverity } of testCases) {
        const result = await logActivity(type, {});
        expect(result?.severity).toBe(expectedSeverity);
      }
    });

    it("logs security events to security log", async () => {
      await logActivity("UNAUTHORIZED_ACCESS", {
        userEmail: "attacker@evil.com",
      });

      expect(db.activityLog.create).toHaveBeenCalled();
    });

    it("logs admin actions to audit log", async () => {
      await logActivity("ADMIN_ADDED", {
        userEmail: "admin@example.com",
        targetUser: "newadmin@example.com",
      });

      expect(db.activityLog.create).toHaveBeenCalled();
    });

    it("includes client info in logs", async () => {
      const result = await logActivity("DOWNLOAD", {
        itemName: "file.zip",
      });

      expect(result?.ipAddress).toBeDefined();
      expect(result?.userAgent).toBeDefined();
    });
  });

  describe("getActivityLogs", () => {
    it("returns empty array when no logs", async () => {
      const logs = await getActivityLogs();
      expect(logs).toEqual([]);
    });

    it("fetches from db correctly", async () => {
      const mockLogs = [
        {
          id: "1",
          type: "UPLOAD",
          timestamp: Date.now(),
          severity: "info",
        },
      ];

      vi.mocked(db.activityLog.findMany).mockResolvedValueOnce(mockLogs as any);

      const logs = await getActivityLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].type).toBe("UPLOAD");
    });
  });

  describe("getActivityStats", () => {
    it("calculates stats correctly", async () => {
      const now = Date.now();
      const mockLogs = [
        {
          id: "1",
          type: "UPLOAD",
          timestamp: now,
          severity: "info",
        },
        {
          id: "2",
          type: "DOWNLOAD",
          timestamp: now - 1000,
          severity: "info",
        },
        {
          id: "3",
          type: "DELETE",
          timestamp: now - 2000,
          severity: "warning",
        },
      ];

      vi.mocked(db.activityLog.findMany).mockResolvedValueOnce(mockLogs as any);

      const stats = await getActivityStats();

      expect(stats.totalLogs).toBe(3);
      expect(stats.byType["UPLOAD"]).toBe(1);
      expect(stats.byType["DOWNLOAD"]).toBe(1);
      expect(stats.bySeverity["info"]).toBe(2);
      expect(stats.bySeverity["warning"]).toBe(1);
      expect(stats.last24Hours).toBe(3);
    });
  });
});
