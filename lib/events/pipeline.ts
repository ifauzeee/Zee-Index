import type { ActivityLog, ActivityType } from "@/lib/activityLogger";
import { kv } from "@/lib/kv";
import { logger } from "@/lib/logger";
import { eventBus } from "@/lib/events/eventBus";
import { appEventSchema, type AppEvent, type EventType } from "@/lib/telemetry";

const EVENT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export const EVENT_PIPELINE_KEYS = {
  activityLog: "zee-index:activity-log",
  eventStream: "zee-index:event-stream",
} as const;

type EventCategory =
  "file" | "share" | "folder" | "auth" | "security" | "system" | "analytics";

export type EventStreamRecord = AppEvent & {
  source: "activity-log" | "analytics" | "system";
  category: EventCategory;
  itemId?: string;
  metadata?: Record<string, unknown>;
};

interface PublishPipelineEventInput {
  id?: string;
  timestamp?: number;
  type: EventType;
  message: string;
  severity: AppEvent["severity"];
  userId?: string;
  userEmail?: string;
  itemName?: string;
  itemId?: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
  category: EventCategory;
  source: EventStreamRecord["source"];
  publishRealtime?: boolean;
}

interface ActivityEventMapping {
  type: EventType;
  category: EventCategory;
  publishRealtime?: boolean;
  message: (log: ActivityLog, metadata?: Record<string, unknown>) => string;
  payload?: (log: ActivityLog, metadata?: Record<string, unknown>) => unknown;
}

function getActor(log: ActivityLog): string {
  if (!log.userEmail) {
    return "System";
  }

  const [name] = log.userEmail.split("@");
  return name || log.userEmail;
}

function getItem(log: ActivityLog): string {
  return log.itemName || "an item";
}

function asMetadata(log: ActivityLog): Record<string, unknown> | undefined {
  if (
    typeof log.metadata === "object" &&
    log.metadata !== null &&
    !Array.isArray(log.metadata)
  ) {
    return log.metadata as Record<string, unknown>;
  }

  return undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function toEventSeverity(
  severity: ActivityLog["severity"],
): AppEvent["severity"] {
  if (severity === "critical") {
    return "error";
  }

  return severity;
}

const activityEventMap: Partial<Record<ActivityType, ActivityEventMapping>> = {
  UPLOAD: {
    type: "file:upload",
    category: "file",
    message: (log) => `${getActor(log)} uploaded ${getItem(log)}`,
    payload: (log, metadata) => ({
      fileId: log.itemId || str(metadata?.fileId),
      parentId: str(metadata?.parentId),
      operation: str(metadata?.operation),
    }),
  },
  DOWNLOAD: {
    type: "file:download",
    category: "file",
    message: (log) => `${getActor(log)} downloaded ${getItem(log)}`,
    payload: (log, metadata) => ({
      fileId: log.itemId || str(metadata?.fileId),
      mimeType: str(metadata?.mimeType),
      rangeRequest: bool(metadata?.rangeRequest),
      isShareAccess: bool(metadata?.isShareAccess),
      shareLinkId: str(metadata?.shareLinkId),
    }),
  },
  DELETE: {
    type: "file:delete",
    category: "file",
    message: (log) => `${getActor(log)} deleted ${getItem(log)}`,
    payload: (log, metadata) => ({
      fileId: log.itemId || str(metadata?.fileId),
      parentId: str(metadata?.parentId),
      operation: str(metadata?.operation),
    }),
  },
  DELETE_FOREVER: {
    type: "file:delete",
    category: "file",
    message: (log) => `${getActor(log)} permanently deleted ${getItem(log)}`,
    payload: (log, metadata) => ({
      fileId: log.itemId || str(metadata?.fileId),
      parentId: str(metadata?.parentId),
      operation: str(metadata?.operation) || "permanent",
    }),
  },
  MOVE: {
    type: "file:move",
    category: "file",
    message: (log) => `${getActor(log)} moved ${getItem(log)}`,
    payload: (log, metadata) => ({
      fileId: log.itemId || str(metadata?.fileId),
      sourceParentId: str(metadata?.sourceParentId),
      destinationParentId: str(metadata?.destinationParentId),
    }),
  },
  RENAME: {
    type: "file:move",
    category: "file",
    message: (log) => `${getActor(log)} renamed ${getItem(log)}`,
    payload: (log, metadata) => ({
      fileId: log.itemId || str(metadata?.fileId),
      sourceParentId: str(metadata?.previousName),
      destinationParentId: str(metadata?.nextName),
    }),
  },
  COPY: {
    type: "file:move",
    category: "file",
    message: (log) => `${getActor(log)} copied ${getItem(log)}`,
    payload: (log, metadata) => ({
      fileId: log.itemId || str(metadata?.fileId),
      sourceParentId: str(metadata?.sourceParentId),
      destinationParentId: str(metadata?.destinationParentId),
    }),
  },
  RESTORE: {
    type: "file:move",
    category: "file",
    message: (log) => `${getActor(log)} restored ${getItem(log)}`,
    payload: (log, metadata) => ({
      fileId: log.itemId || str(metadata?.fileId),
      sourceParentId: str(metadata?.sourceParentId),
      destinationParentId: str(metadata?.destinationParentId),
    }),
  },
  SHARE_LINK_CREATED: {
    type: "share:create",
    category: "share",
    message: (log) => `${getActor(log)} created a share link`,
    payload: (log, metadata) => ({
      shareId: str(metadata?.shareId),
      sharePath: str(metadata?.sharePath) || log.itemId,
      isCollection: bool(metadata?.isCollection),
    }),
  },
  SHARE_LINK_DELETED: {
    type: "share:delete",
    category: "share",
    message: (log) => `${getActor(log)} deleted a share link`,
    payload: (_, metadata) => ({
      shareId: str(metadata?.shareId),
      sharePath: str(metadata?.sharePath),
    }),
  },
  SHARE_LINK_ACCESSED: {
    type: "share:access",
    category: "share",
    publishRealtime: false,
    message: (log) => `${getActor(log)} accessed shared content`,
    payload: (log, metadata) => ({
      shareId: str(metadata?.shareId),
      folderId: log.itemId || str(metadata?.folderId),
      shareTokenPresent: bool(metadata?.shareTokenPresent),
    }),
  },
  FILE_REQUEST_CREATED: {
    type: "folder:update",
    category: "folder",
    publishRealtime: false,
    message: (log) => `${getActor(log)} created a file request`,
    payload: (log, metadata) => ({
      folderId: log.itemId || str(metadata?.folderId),
      action: "file_request_created",
    }),
  },
  FILE_REQUEST_DELETED: {
    type: "folder:update",
    category: "folder",
    publishRealtime: false,
    message: (log) => `${getActor(log)} deleted a file request`,
    payload: (log, metadata) => ({
      folderId: log.itemId || str(metadata?.folderId),
      action: "file_request_deleted",
    }),
  },
  ADMIN_ADDED: {
    type: "system:alert",
    category: "system",
    message: (log) => `${getActor(log)} granted admin access`,
    payload: (log, metadata) => ({
      source: str(metadata?.source) || "admin",
      folderId: str(metadata?.folderId),
      targetUser: log.targetUser || str(metadata?.targetUser),
    }),
  },
  ADMIN_REMOVED: {
    type: "system:alert",
    category: "system",
    message: (log) => `${getActor(log)} revoked admin access`,
    payload: (log, metadata) => ({
      source: str(metadata?.source) || "admin",
      targetUser: log.targetUser || str(metadata?.targetUser),
    }),
  },
  CONFIG_CHANGED: {
    type: "system:alert",
    category: "system",
    message: (log) => `${getActor(log)} changed system configuration`,
    payload: () => ({ source: "config" }),
  },
  PROTECTED_FOLDER_ADDED: {
    type: "folder:update",
    category: "folder",
    message: (log, metadata) =>
      `${getActor(log)} protected folder ${str(metadata?.folderId) || log.itemId || ""}`.trim(),
    payload: (log, metadata) => ({
      folderId: log.itemId || str(metadata?.folderId),
      action: "protected_added",
    }),
  },
  PROTECTED_FOLDER_REMOVED: {
    type: "folder:update",
    category: "folder",
    message: (log, metadata) =>
      `${getActor(log)} unprotected folder ${str(metadata?.folderId) || log.itemId || ""}`.trim(),
    payload: (log, metadata) => ({
      folderId: log.itemId || str(metadata?.folderId),
      action: "protected_removed",
    }),
  },
  USER_ACCESS_GRANTED: {
    type: "folder:update",
    category: "folder",
    message: (log) => `${getActor(log)} granted folder access`,
    payload: (log, metadata) => ({
      folderId: log.itemId || str(metadata?.folderId),
      action: "access_granted",
    }),
  },
  USER_ACCESS_REVOKED: {
    type: "folder:update",
    category: "folder",
    message: (log) => `${getActor(log)} revoked folder access`,
    payload: (log, metadata) => ({
      folderId: log.itemId || str(metadata?.folderId),
      action: "access_revoked",
    }),
  },
  LOGIN_SUCCESS: {
    type: "auth:login",
    category: "auth",
    publishRealtime: false,
    message: (log) => `${getActor(log)} signed in`,
    payload: (log) => ({
      method: "credentials",
      role: log.userRole,
      source: "auth",
    }),
  },
  LOGOUT: {
    type: "auth:login",
    category: "auth",
    publishRealtime: false,
    message: (log) => `${getActor(log)} signed out`,
    payload: () => ({
      method: "logout",
      source: "auth",
    }),
  },
  "2FA_VERIFIED": {
    type: "auth:login",
    category: "auth",
    publishRealtime: false,
    message: (log) => `${getActor(log)} verified 2FA`,
    payload: (log) => ({
      method: "2fa",
      role: log.userRole,
      source: "auth",
    }),
  },
  "2FA_ENABLED": {
    type: "auth:login",
    category: "auth",
    publishRealtime: false,
    message: (log) => `${getActor(log)} enabled 2FA`,
    payload: () => ({
      method: "2fa_enabled",
      source: "auth",
    }),
  },
  "2FA_DISABLED": {
    type: "auth:login",
    category: "auth",
    publishRealtime: false,
    message: (log) => `${getActor(log)} disabled 2FA`,
    payload: () => ({
      method: "2fa_disabled",
      source: "auth",
    }),
  },
  LOGIN_FAILURE: {
    type: "auth:failure",
    category: "auth",
    message: (log) => `${getActor(log)} failed to authenticate`,
    payload: (_, metadata) => ({
      reason: str(metadata?.reason),
      scope: "auth",
      requestedFolderId: str(metadata?.requestedFolderId),
    }),
  },
  SESSION_EXPIRED: {
    type: "auth:failure",
    category: "auth",
    publishRealtime: false,
    message: (log) => `${getActor(log)} session expired`,
    payload: () => ({
      reason: "session_expired",
      scope: "auth",
    }),
  },
  RATE_LIMITED: {
    type: "security:alert",
    category: "security",
    message: () => "Rate limit threshold reached",
    payload: (_, metadata) => ({
      reason: "rate_limited",
      scope: str(metadata?.scope),
      identifier: str(metadata?.identifier),
    }),
  },
  UNAUTHORIZED_ACCESS: {
    type: "security:alert",
    category: "security",
    message: () => "Unauthorized access attempt detected",
    payload: (_, metadata) => ({
      reason: str(metadata?.reason) || "unauthorized_access",
      resourceId: str(metadata?.resourceId),
      scope: str(metadata?.resourceType),
    }),
  },
  SUSPICIOUS_ACTIVITY: {
    type: "security:alert",
    category: "security",
    message: () => "Suspicious activity detected",
    payload: (_, metadata) => ({
      reason: str(metadata?.reason) || "suspicious_activity",
      resourceId: str(metadata?.resourceId),
    }),
  },
};

async function trimHistory(
  key: string,
  newestTimestamp: number,
): Promise<void> {
  const cutoff = newestTimestamp - EVENT_RETENTION_MS;
  await kv.zremrangebyscore(key, 0, cutoff);
}

async function appendActivityLogToPipeline(log: ActivityLog) {
  try {
    await kv.zadd(EVENT_PIPELINE_KEYS.activityLog, {
      score: log.timestamp,
      member: JSON.stringify(log),
    });
    await trimHistory(EVENT_PIPELINE_KEYS.activityLog, log.timestamp);
  } catch (err) {
    logger.error(
      { err, logType: log.type },
      "[EventPipeline] log append failed",
    );
  }
}

export async function publishPipelineEvent(
  input: PublishPipelineEventInput,
): Promise<AppEvent | null> {
  try {
    const parsed = appEventSchema.parse({
      id: input.id || crypto.randomUUID(),
      timestamp: input.timestamp || Date.now(),
      type: input.type,
      message: input.message,
      severity: input.severity,
      userId: input.userId,
      userEmail: input.userEmail,
      itemName: input.itemName,
      payload: input.payload,
    });

    const streamRecord: EventStreamRecord = {
      ...parsed,
      source: input.source,
      category: input.category,
      itemId: input.itemId,
      metadata: input.metadata,
    };

    await kv.zadd(EVENT_PIPELINE_KEYS.eventStream, {
      score: parsed.timestamp,
      member: JSON.stringify(streamRecord),
    });
    await trimHistory(EVENT_PIPELINE_KEYS.eventStream, parsed.timestamp);

    if (input.publishRealtime !== false) {
      await eventBus.emitValidated(parsed);
    }

    return parsed;
  } catch (err) {
    logger.error(
      { err, eventType: input.type },
      "[EventPipeline] event publish failed",
    );
    return null;
  }
}

export async function publishActivityEvent(log: ActivityLog): Promise<void> {
  await appendActivityLogToPipeline(log);

  const metadata = asMetadata(log);
  const mapping = activityEventMap[log.type];
  if (!mapping) {
    return;
  }

  await publishPipelineEvent({
    id: log.id,
    timestamp: log.timestamp,
    type: mapping.type,
    message: mapping.message(log, metadata),
    severity: toEventSeverity(log.severity),
    userId: log.userId,
    userEmail: log.userEmail || undefined,
    itemName: log.itemName,
    itemId: log.itemId,
    payload: mapping.payload?.(log, metadata),
    metadata,
    category: mapping.category,
    source: "activity-log",
    publishRealtime: mapping.publishRealtime,
  });
}

export async function clearEventPipeline() {
  await kv.del(
    EVENT_PIPELINE_KEYS.activityLog,
    EVENT_PIPELINE_KEYS.eventStream,
  );
}

export function mapBandwidthToSeverity(bytes: number): AppEvent["severity"] {
  if (bytes >= 250 * 1024 * 1024) {
    return "warning";
  }
  if (bytes <= 0) {
    return "info";
  }
  return "success";
}
