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

const folderUpdateEventPayloadSchema = z.object({
  folderId: z.string().optional(),
  action: z.string().optional(),
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

export const appEventPayloadSchemas = {
  "file:upload": fileUploadEventPayloadSchema,
  "file:delete": fileDeleteEventPayloadSchema,
  "file:move": fileMoveEventPayloadSchema,
  "share:create": shareCreateEventPayloadSchema,
  "folder:update": folderUpdateEventPayloadSchema,
  "storage:warning": storageWarningEventPayloadSchema,
  "system:alert": systemAlertEventPayloadSchema,
} as const;

export type EventType = keyof typeof appEventPayloadSchemas;

const appEventBaseSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "file:upload",
    "file:delete",
    "file:move",
    "share:create",
    "folder:update",
    "storage:warning",
    "system:alert",
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
    type: z.literal("folder:update"),
    payload: folderUpdateEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("storage:warning"),
    payload: storageWarningEventPayloadSchema.optional(),
  }),
  appEventBaseSchema.extend({
    type: z.literal("system:alert"),
    payload: systemAlertEventPayloadSchema.optional(),
  }),
]);

export type PageViewEvent = z.infer<typeof pageViewEventSchema>;
export type PopularPagePayload = z.infer<typeof popularPagePayloadSchema>;
export type DeviceStatsPayload = z.infer<typeof deviceStatsPayloadSchema>;
export type ReferrerPayload = z.infer<typeof referrerPayloadSchema>;
export type AppEvent = z.infer<typeof appEventSchema>;
export type AppEventPayloadByType = {
  [K in EventType]: z.infer<(typeof appEventPayloadSchemas)[K]>;
};

export function parseSchemaValue<T>(
  raw: string,
  schema: z.ZodSchema<T>,
): T | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
