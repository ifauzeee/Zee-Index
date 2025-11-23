import { kv } from "@vercel/kv";

export type ActivityType =
  | "UPLOAD"
  | "DOWNLOAD"
  | "DELETE"
  | "RENAME"
  | "MOVE"
  | "COPY"
  | "SHARE_LINK_CREATED"
  | "SHARE_LINK_DELETED"
  | "ADMIN_ADDED"
  | "ADMIN_REMOVED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE";

export interface ActivityDetails {
  itemName?: string;
  itemSize?: string | number;
  userEmail?: string | null;
  targetUser?: string;
  destinationFolder?: string;
  status?: "success" | "failure";
  error?: string;
}

export interface ActivityLog extends ActivityDetails {
  type: ActivityType;
  timestamp: number;
}

const ACTIVITY_LOG_KEY = "zee-index:activity-log";
const LOG_EXPIRATION_SECONDS = 60 * 60 * 24 * 30;

export async function logActivity(
  type: ActivityType,
  details: ActivityDetails = {},
) {
  try {
    const timestamp = Date.now();
    const logEntry = {
      type,
      timestamp,
      ...details,
    };
    await kv.zadd(ACTIVITY_LOG_KEY, {
      score: timestamp,
      member: JSON.stringify(logEntry),
    });

    const thirtyDaysAgo = Date.now() - LOG_EXPIRATION_SECONDS * 1000;
    await kv.zremrangebyscore(ACTIVITY_LOG_KEY, 0, thirtyDaysAgo);
  } catch (error) {
    console.error("Gagal mencatat aktivitas:", error);
  }
}
