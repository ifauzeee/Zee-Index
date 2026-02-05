import { kv } from "./kv";

export interface AuditLogEntry {
  timestamp: number;
  email: string;
  action:
    | "VIEW"
    | "DOWNLOAD"
    | "UPLOAD"
    | "DELETE"
    | "MOVE"
    | "RENAME"
    | "SHARE_ACCESS";
  fileId: string;
  fileName: string;
  ip: string;
  userAgent?: string;
  folderId?: string;
}

export async function logAudit(entry: Omit<AuditLogEntry, "timestamp">) {
  try {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    const key = "zee-index:audit-logs";
    await kv.lpush(key, JSON.stringify(fullEntry));
    await kv.lrange(key, 0, 999);
  } catch (error) {
    console.error("[Audit] Failed to log event:", error);
  }
}
