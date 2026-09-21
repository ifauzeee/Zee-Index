import { z } from "zod";

const eventSeveritySchema = z.enum(["info", "warning", "error", "success"]);

export const analyticsTrackRequestSchema = z.object({
  path: z.string().trim().min(1).max(512).default("/"),
  referrer: z.string().trim().max(2048).default(""),
});

export const pageViewEventSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  timestamp: z.number(),
  visitorId: z.string().min(1),
  ip: z.string().min(1),
  userAgent: z.string().min(1),
  referrer: z.string(),
  browser: z.string().min(1),
  os: z.string().min(1),
  device: z.string().min(1),
});

export const popularPagePayloadSchema = z.object({
  path: z.string().min(1),
  dayKey: z.string().min(1),
});

export const deviceStatsPayloadSchema = z.object({
  browser: z.string().min(1),
  os: z.string().min(1),
  device: z.string().min(1),
  dayKey: z.string().min(1),
});

export const referrerPayloadSchema = z.object({
  source: z.string().min(1),
  dayKey: z.string().min(1),
});

const fileUploadEventPayloadSchema = z.object({
  fileId: z.string().optional(),
  parentId: z.string().optional(),
  operation: z.string().optional(),
});

const fileDownloadEventPayloadSchema = z.object({
  fileId: z.string().optional(),
  mimeType: z.string().optional(),
  rangeRequest: z.boolean().optional(),
  isShareAccess: z.boolean().optional(),
  shareLinkId: z.string().optional(),
});

const fileDeleteEventPayloadSchema = z.object({
  fileId: z.string().optional(),
  parentId: z.string().optional(),
  operation: z.string().optional(),
});

const fileMoveEventPayloadSchema = z.object({
  fileId: z.string().optional(),
  sourceParentId: z.string().optional(),
  destinationParentId: z.string().optional(),
});

const shareCreateEventPayloadSchema = z.object({
  shareId: z.string().optional(),
  sharePath: z.string().optional(),
  isCollection: z.boolean().optional(),
});

const shareDeleteEventPayloadSchema = z.object({
  shareId: z.string().optional(),
  sharePath: z.string().optional(),
});

const shareAccessEventPayloadSchema = z.object({
  shareId: z.string().optional(),
  folderId: z.string().optional(),
  shareTokenPresent: z.boolean().optional(),
});

const folderUpdateEventPayloadSchema = z.object({
  folderId: z.string().optional(),
  action: z.string().optional(),
});

const authLoginEventPayloadSchema = z.object({
  method: z.string().optional(),
  role: z.string().optional(),
  source: z.string().optional(),
});

const authFailureEventPayloadSchema = z.object({
  reason: z.string().optional(),
  scope: z.string().optional(),
  identifier: z.string().optional(),
  requestedFolderId: z.string().optional(),
});

const securityAlertEventPayloadSchema = z.object({
  reason: z.string().optional(),
  resourceId: z.string().optional(),
  scope: z.string().optional(),
  identifier: z.string().optional(),
});

const storageWarningEventPayloadSchema = z.object({
  percentUsed: z.number().optional(),
  bytesUsed: z.number().optional(),
  bytesLimit: z.number().optional(),
});

const systemAlertEventPayloadSchema = z.object({
  source: z.string().optional(),
  folderId: z.string().optional(),
  targetUser: z.string().optional(),
});

const analyticsPageviewPayloadSchema = z.object({
  path: z.string().optional(),
  referrer: z.string().optional(),
  visitorId: z.string().optional(),
  ip: z.string().optional(),
});

const analyticsBandwidthPayloadSchema = z.object({
  bytes: z.number().optional(),
  dayKey: z.string().optional(),
});

export const appEventPayloadSchemas = {
  "file:upload": fileUploadEventPayloadSchema,
  "file:download": fileDownloadEventPayloadSchema,
  "file:delete": fileDeleteEventPayloadSchema,
  "file:move": fileMoveEventPayloadSchema,
  "share:create": shareCreateEventPayloadSchema,
  "share:delete": shareDeleteEventPayloadSchema,
  "share:access": shareAccessEventPayloadSchema,
  "folder:update": folderUpdateEventPayloadSchema,
  "auth:login": authLoginEventPayloadSchema,
  "auth:failure": authFailureEventPayloadSchema,
  "security:alert": securityAlertEventPayloadSchema,
  "storage:warning": storageWarningEventPayloadSchema,
  "system:alert": systemAlertEventPayloadSchema,
  "analytics:pageview": analyticsPageviewPayloadSchema,
  "analytics:bandwidth": analyticsBandwidthPayloadSchema,
} as const;

export type EventType = keyof typeof appEventPayloadSchemas;

const appEventBaseSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "file:upload",
    "file:download",
    "file:delete",
    "file:move",
    "share:create",
    "share:delete",
    "share:access",
    "folder:update",
    "auth:login",
    "auth:failure",
    "security:alert",
    "storage:warning",
    "system:alert",
    "analytics:pageview",
    "analytics:bandwidth",
  ]),
  message: z.string().min(1),
  severity: eventSeveritySchema,
  userId: z.string().optional(),
  userEmail: z.string().optional(),
  itemName: z.string().optional(),
  timestamp: z.number(),
});

export const appEventSchema = z.discriminatedUnion("type", [
  appEventBaseSchema.extend({
    type: z.literal("file:upload"),
    payload: fileUploadEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("file:download"),
    payload: fileDownloadEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("file:delete"),
    payload: fileDeleteEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("file:move"),
    payload: fileMoveEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("share:create"),
    payload: shareCreateEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("share:delete"),
    payload: shareDeleteEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("share:access"),
    payload: shareAccessEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("folder:update"),
    payload: folderUpdateEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("auth:login"),
    payload: authLoginEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("auth:failure"),
    payload: authFailureEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("security:alert"),
    payload: securityAlertEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("storage:warning"),
    payload: storageWarningEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("system:alert"),
    payload: systemAlertEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("analytics:pageview"),
    payload: analyticsPageviewPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("analytics:bandwidth"),
    payload: analyticsBandwidthPayloadSchema.optional(),
  }),
]);

export type PopularPagePayload = z.infer<typeof popularPagePayloadSchema>;
export type DeviceStatsPayload = z.infer<typeof deviceStatsPayloadSchema>;
export type ReferrerPayload = z.infer<typeof referrerPayloadSchema>;
export type AppEvent = z.infer<typeof appEventSchema>;
export type AppEventPayloadByType = {
  [K in EventType]: z.infer<(typeof appEventPayloadSchemas)[K]>;
};

export function parseSchemaValue<T>(
  raw: unknown,
  schema: z.ZodSchema<T>,
): T | null {
  if (typeof raw === "string") {
    if (raw === "[object Object]") {
      return null;
    }

    try {
      return parseSchemaValue(JSON.parse(raw) as unknown, schema);
    } catch {
      return null;
    }
  }

  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
