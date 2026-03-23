import { headers } from "next/headers";
import type { ActivityLog as DbActivityLog } from "@prisma/client";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { eventBus, EventType } from "@/lib/events/eventBus";

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
  userRole?: "ADMIN" | "USER" | "GUEST" | "EDITOR";
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

function parseMetadata(
  metadata: string | null,
): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(metadata);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function toActivityLog(log: DbActivityLog): ActivityLog {
  return {
    id: log.id,
    type: log.type as ActivityType,
    timestamp: log.timestamp,
    severity: log.severity as ActivityLog["severity"],
    itemName: log.itemName ?? undefined,
    itemId: log.itemId ?? undefined,
    itemSize: log.itemSize ?? undefined,
    itemType: log.itemType ?? undefined,
    userEmail: log.userEmail ?? undefined,
    userId: log.userId ?? undefined,
    userRole: (log.userRole as ActivityDetails["userRole"] | null) ?? undefined,
    targetUser: log.targetUser ?? undefined,
    destinationFolder: log.destinationFolder ?? undefined,
    sourcePath: log.sourcePath ?? undefined,
    targetPath: log.targetPath ?? undefined,
    status: (log.status as ActivityDetails["status"] | null) ?? undefined,
    error: log.error ?? undefined,
    errorCode: log.errorCode ?? undefined,
    ipAddress: log.ipAddress ?? undefined,
    userAgent: log.userAgent ?? undefined,
    country: log.country ?? undefined,
    city: log.city ?? undefined,
    metadata: parseMetadata(log.metadata),
  };
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

    const logEntry = await db.activityLog.create({
      data: {
        type,
        timestamp,
        severity: SEVERITY_MAP[type] || "info",
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        itemName: details.itemName,
        itemId: details.itemId,
        itemSize: details.itemSize?.toString(),
        itemType: details.itemType,
        userEmail: details.userEmail,
        userId: details.userId,
        userRole: details.userRole,
        targetUser: details.targetUser,
        destinationFolder: details.destinationFolder,
        sourcePath: details.sourcePath,
        targetPath: details.targetPath,
        status: details.status,
        error: details.error,
        errorCode: details.errorCode,
        country: details.country,
        city: details.city,
        metadata: details.metadata ? JSON.stringify(details.metadata) : null,
      },
    });

    let eventType: EventType | null = null;
    if (type === "UPLOAD") eventType = "file:upload";
    else if (type === "DELETE" || type === "DELETE_FOREVER")
      eventType = "file:delete";
    else if (["MOVE", "RENAME", "COPY", "RESTORE"].includes(type))
      eventType = "file:move";
    else if (type === "SHARE_LINK_CREATED") eventType = "share:create";
    else if (
      ["CONFIG_CHANGED", "ADMIN_ADDED", "PROTECTED_FOLDER_ADDED"].includes(type)
    )
      eventType = "system:alert";

    if (eventType) {
      const user = details.userEmail
        ? details.userEmail.split("@")[0]
        : "Someone";
      const item = details.itemName || "an item";
      const msgMap: Record<string, string> = {
        "file:upload": `${user} uploaded ${item}`,
        "file:delete": `${user} deleted ${item}`,
        "file:move": `${user} modified ${item}`,
        "share:create": `${user} shared ${item}`,
        "system:alert": `System config changed by ${user}`,
      };

      eventBus
        .emit({
          type: eventType,
          message: msgMap[eventType] || `${user} performed an action`,
          severity:
            SEVERITY_MAP[type] === "critical"
              ? "error"
              : (SEVERITY_MAP[type] as
                  | "info"
                  | "warning"
                  | "error"
                  | "success"),
          userEmail: details.userEmail || undefined,
          userId: details.userId || undefined,
          itemName: details.itemName || undefined,
        })
        .catch((err) => {
          logger.error({ err }, "Failed to emit event to EventBus");
        });
    }

    const expirationTime = Date.now() - 60 * 60 * 24 * 90 * 1000;
    db.activityLog
      .deleteMany({
        where: { timestamp: { lt: expirationTime } },
      })
      .catch((error: unknown) =>
        logger.error({ err: error }, "Failed to clean old activity logs"),
      );

    return toActivityLog(logEntry);
  } catch (error) {
    logger.error({ err: error }, "Failed to log activity");
    return null;
  }
}

export async function getActivityLogs(
  limit: number = 100,
  offset: number = 0,
): Promise<ActivityLog[]> {
  try {
    const logs = await db.activityLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { timestamp: "desc" },
    });

    return logs.map(toActivityLog);
  } catch (error) {
    logger.error({ err: error }, "Failed to get activity logs");
    return [];
  }
}

export async function getSecurityLogs(
  limit: number = 100,
): Promise<ActivityLog[]> {
  try {
    const logs = await db.activityLog.findMany({
      where: {
        type: {
          in: [
            "UNAUTHORIZED_ACCESS",
            "SUSPICIOUS_ACTIVITY",
            "LOGIN_FAILURE",
            "RATE_LIMITED",
          ],
        },
      },
      take: limit,
      orderBy: { timestamp: "desc" },
    });

    return logs.map(toActivityLog);
  } catch (error) {
    logger.error({ err: error }, "Failed to get security logs");
    return [];
  }
}

export async function getActivityStats(): Promise<{
  totalLogs: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  last24Hours: number;
  last7Days: number;
}> {
  try {
    const rawLogs = await db.activityLog.findMany({
      take: 1000,
      orderBy: { timestamp: "desc" },
    });

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let last24Hours = 0;
    let last7Days = 0;

    for (const log of rawLogs) {
      byType[log.type] = (byType[log.type] || 0) + 1;
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;

      if (log.timestamp > oneDayAgo) last24Hours++;
      if (log.timestamp > sevenDaysAgo) last7Days++;
    }

    return {
      totalLogs: rawLogs.length,
      byType,
      bySeverity,
      last24Hours,
      last7Days,
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to get activity stats");
    return {
      totalLogs: 0,
      byType: {},
      bySeverity: {},
      last24Hours: 0,
      last7Days: 0,
    };
  }
}
