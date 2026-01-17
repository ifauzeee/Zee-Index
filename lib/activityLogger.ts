import { kv } from "@/lib/kv";
import { headers } from "next/headers";

export type ActivityType =
  | "UPLOAD"
  | "DOWNLOAD"
  | "DELETE"
  | "RENAME"
  | "MOVE"
  | "COPY"
  | "RESTORE"
  | "DELETE_FOREVER"
  | "SHARE_LINK_CREATED"
  | "SHARE_LINK_DELETED"
  | "SHARE_LINK_ACCESSED"
  | "FILE_REQUEST_CREATED"
  | "FILE_REQUEST_DELETED"
  | "ADMIN_ADDED"
  | "ADMIN_REMOVED"
  | "CONFIG_CHANGED"
  | "PROTECTED_FOLDER_ADDED"
  | "PROTECTED_FOLDER_REMOVED"
  | "USER_ACCESS_GRANTED"
  | "USER_ACCESS_REVOKED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "2FA_ENABLED"
  | "2FA_DISABLED"
  | "2FA_VERIFIED"
  | "SESSION_EXPIRED"
  | "RATE_LIMITED"
  | "UNAUTHORIZED_ACCESS"
  | "SUSPICIOUS_ACTIVITY";

export interface ActivityDetails {
  itemName?: string;
  itemId?: string;
  itemSize?: string | number;
  itemType?: string;
  userEmail?: string | null;
  userId?: string;
  userRole?: "ADMIN" | "USER" | "GUEST";
  targetUser?: string;
  destinationFolder?: string;
  sourcePath?: string;
  targetPath?: string;
  status?: "success" | "failure" | "blocked";
  error?: string;
  errorCode?: string;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityLog extends ActivityDetails {
  id: string;
  type: ActivityType;
  timestamp: number;
  severity: "info" | "warning" | "error" | "critical";
}

const ACTIVITY_LOG_KEY = "zee-index:activity-log";
const ADMIN_AUDIT_KEY = "zee-index:admin-audit-log";
const SECURITY_LOG_KEY = "zee-index:security-log";
const LOG_EXPIRATION_SECONDS = 60 * 60 * 24 * 90;

const SEVERITY_MAP: Record<ActivityType, ActivityLog["severity"]> = {
  UPLOAD: "info",
  DOWNLOAD: "info",
  RENAME: "info",
  MOVE: "info",
  COPY: "info",
  RESTORE: "info",
  SHARE_LINK_CREATED: "info",
  SHARE_LINK_ACCESSED: "info",
  FILE_REQUEST_CREATED: "info",
  LOGIN_SUCCESS: "info",
  LOGOUT: "info",
  "2FA_VERIFIED": "info",
  DELETE: "warning",
  DELETE_FOREVER: "warning",
  SHARE_LINK_DELETED: "warning",
  FILE_REQUEST_DELETED: "warning",
  SESSION_EXPIRED: "warning",
  RATE_LIMITED: "warning",
  LOGIN_FAILURE: "error",
  UNAUTHORIZED_ACCESS: "error",
  ADMIN_ADDED: "critical",
  ADMIN_REMOVED: "critical",
  CONFIG_CHANGED: "critical",
  PROTECTED_FOLDER_ADDED: "critical",
  PROTECTED_FOLDER_REMOVED: "critical",
  USER_ACCESS_GRANTED: "critical",
  USER_ACCESS_REVOKED: "critical",
  "2FA_ENABLED": "critical",
  "2FA_DISABLED": "critical",
  SUSPICIOUS_ACTIVITY: "critical",
};

function generateLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function getClientInfo(): Promise<{
  ipAddress: string;
  userAgent: string;
}> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const userAgent = headersList.get("user-agent") || "unknown";

    let ipAddress = "unknown";
    if (forwardedFor) {
      ipAddress = forwardedFor.split(",")[0].trim();
    } else if (realIp) {
      ipAddress = realIp;
    }

    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: "unknown", userAgent: "unknown" };
  }
}

export async function logActivity(
  type: ActivityType,
  details: ActivityDetails = {},
) {
  try {
    const timestamp = Date.now();
    const clientInfo = await getClientInfo();

    const logEntry: ActivityLog = {
      id: generateLogId(),
      type,
      timestamp,
      severity: SEVERITY_MAP[type] || "info",
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      ...details,
    };

    await kv.zadd(ACTIVITY_LOG_KEY, {
      score: timestamp,
      member: JSON.stringify(logEntry),
    });

    if (SEVERITY_MAP[type] === "critical") {
      await kv.zadd(ADMIN_AUDIT_KEY, {
        score: timestamp,
        member: JSON.stringify(logEntry),
      });
    }

    if (
      type === "UNAUTHORIZED_ACCESS" ||
      type === "SUSPICIOUS_ACTIVITY" ||
      type === "LOGIN_FAILURE" ||
      type === "RATE_LIMITED"
    ) {
      await kv.zadd(SECURITY_LOG_KEY, {
        score: timestamp,
        member: JSON.stringify(logEntry),
      });
    }

    const expirationTime = Date.now() - LOG_EXPIRATION_SECONDS * 1000;
    await Promise.all([
      kv.zremrangebyscore(ACTIVITY_LOG_KEY, 0, expirationTime),
      kv.zremrangebyscore(ADMIN_AUDIT_KEY, 0, expirationTime),
      kv.zremrangebyscore(SECURITY_LOG_KEY, 0, expirationTime),
    ]);

    return logEntry;
  } catch (error) {
    console.error("Failed to log activity:", error);
    return null;
  }
}

export async function logAdminAudit(
  action: ActivityType,
  adminEmail: string,
  details: Omit<ActivityDetails, "userEmail"> = {},
) {
  return logActivity(action, {
    ...details,
    userEmail: adminEmail,
    userRole: "ADMIN",
  });
}

export async function logSecurityEvent(
  event: "RATE_LIMITED" | "UNAUTHORIZED_ACCESS" | "SUSPICIOUS_ACTIVITY",
  details: ActivityDetails = {},
) {
  return logActivity(event, {
    ...details,
    status: "blocked",
  });
}

export async function getActivityLogs(
  limit: number = 100,
  offset: number = 0,
): Promise<ActivityLog[]> {
  try {
    const logs = await kv.zrange(ACTIVITY_LOG_KEY, offset, offset + limit - 1, {
      rev: true,
    });

    return logs.map((log) =>
      typeof log === "string" ? JSON.parse(log) : log,
    ) as ActivityLog[];
  } catch (error) {
    console.error("Failed to get activity logs:", error);
    return [];
  }
}

export async function getAdminAuditLogs(
  limit: number = 100,
): Promise<ActivityLog[]> {
  try {
    const logs = await kv.zrange(ADMIN_AUDIT_KEY, 0, limit - 1, { rev: true });

    return logs.map((log) =>
      typeof log === "string" ? JSON.parse(log) : log,
    ) as ActivityLog[];
  } catch (error) {
    console.error("Failed to get admin audit logs:", error);
    return [];
  }
}

export async function getSecurityLogs(
  limit: number = 100,
): Promise<ActivityLog[]> {
  try {
    const logs = await kv.zrange(SECURITY_LOG_KEY, 0, limit - 1, { rev: true });

    return logs.map((log) =>
      typeof log === "string" ? JSON.parse(log) : log,
    ) as ActivityLog[];
  } catch (error) {
    console.error("Failed to get security logs:", error);
    return [];
  }
}

export async function getLogsByUser(
  email: string,
  limit: number = 50,
): Promise<ActivityLog[]> {
  const allLogs = await getActivityLogs(500);
  return allLogs.filter((log) => log.userEmail === email).slice(0, limit);
}

export async function getLogsByType(
  type: ActivityType,
  limit: number = 50,
): Promise<ActivityLog[]> {
  const allLogs = await getActivityLogs(500);
  return allLogs.filter((log) => log.type === type).slice(0, limit);
}

export async function getActivityStats(): Promise<{
  totalLogs: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  last24Hours: number;
  last7Days: number;
}> {
  try {
    const allLogs = await getActivityLogs(1000);
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let last24Hours = 0;
    let last7Days = 0;

    for (const log of allLogs) {
      byType[log.type] = (byType[log.type] || 0) + 1;
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;

      if (log.timestamp > oneDayAgo) last24Hours++;
      if (log.timestamp > sevenDaysAgo) last7Days++;
    }

    return {
      totalLogs: allLogs.length,
      byType,
      bySeverity,
      last24Hours,
      last7Days,
    };
  } catch (error) {
    console.error("Failed to get activity stats:", error);
    return {
      totalLogs: 0,
      byType: {},
      bySeverity: {},
      last24Hours: 0,
      last7Days: 0,
    };
  }
}
