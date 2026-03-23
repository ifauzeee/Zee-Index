import { z } from "zod";

export const shareTokenPayloadSchema = z
  .object({
    exp: z.number().optional(),
    iat: z.number().optional(),
    jti: z.string().min(1).optional(),
    folderId: z.string().min(1).optional(),
    loginRequired: z.boolean().optional(),
    preventDownload: z.boolean().optional(),
    hasWatermark: z.boolean().optional(),
    watermarkText: z.string().nullable().optional(),
  })
  .passthrough();

export const driveFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  size: z.string().optional(),
  modifiedTime: z.string(),
  createdTime: z.string(),
  webViewLink: z.string(),
  webContentLink: z.string().optional(),
  thumbnailLink: z.string().optional(),
  hasThumbnail: z.boolean(),
  isFolder: z.boolean(),
  isProtected: z.boolean().optional(),
  parents: z.array(z.string()).optional(),
  owners: z
    .array(
      z.object({
        displayName: z.string(),
        emailAddress: z.string(),
      }),
    )
    .optional(),
  lastModifyingUser: z
    .object({
      displayName: z.string(),
    })
    .optional(),
  md5Checksum: z.string().optional(),
  imageMediaMetadata: z
    .object({
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  videoMediaMetadata: z
    .object({
      width: z.number(),
      height: z.number(),
      durationMillis: z.string(),
    })
    .optional(),
  trashed: z.boolean(),
  sharedWithMeTime: z.string().optional(),
  shortcutDetails: z
    .object({
      targetId: z.string(),
      targetMimeType: z.string(),
    })
    .optional(),
});

export const shareCollectionItemsSchema = z.array(driveFileSchema);

export const shareCreateRequestSchema = z
  .object({
    path: z.string().min(1).optional(),
    itemName: z.string().min(1),
    type: z.enum(["timed", "session"]),
    expiresIn: z.string().min(1),
    loginRequired: z.boolean().optional(),
    items: shareCollectionItemsSchema.optional(),
    maxUses: z.number().int().positive().nullable().optional(),
    preventDownload: z.boolean().optional(),
    hasWatermark: z.boolean().optional(),
    watermarkText: z.string().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const hasCollection = Array.isArray(value.items) && value.items.length > 0;
    if (!hasCollection && !value.path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either path or collection items are required.",
        path: ["path"],
      });
    }
  });

export const shareTokenRequestSchema = z.object({
  shareToken: z.string().min(1),
});

export const shareDeleteRequestSchema = z.object({
  id: z.string().min(1),
  jti: z.string().min(1),
  expiresAt: z.string().min(1),
});

export const shareRevokeRequestSchema = z.object({
  jti: z.string().min(1),
  expiresAt: z.string().min(1),
});

export const fileRequestCreateSchema = z.object({
  folderId: z.string().min(1),
  folderName: z.string().min(1),
  title: z.string().min(1),
  expiresIn: z.number().int().min(1),
});

export const fileRequestLinkSchema = z.object({
  token: z.string().min(1),
  folderId: z.string().min(1),
  folderName: z.string().min(1),
  title: z.string().min(1),
  expiresAt: z.number(),
  createdAt: z.number(),
  createdBy: z.string().optional(),
  type: z.literal("file-request"),
});

export const fileRequestDeleteSchema = z.object({
  token: z.string().min(1),
});

export const fileRequestUploadInitSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().nonnegative(),
});

export const accessRequestRecordSchema = z
  .object({
    folderId: z.string().min(1),
    folderName: z.string().optional(),
    email: z.string().min(1),
    name: z.string().nullable().optional(),
    timestamp: z.number(),
  })
  .passthrough();

export const accessRequestCreateSchema = z.object({
  folderId: z.string().min(1),
  folderName: z.string().min(1),
});

export const accessRequestActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  requestData: accessRequestRecordSchema,
});

export type ShareTokenPayload = z.infer<typeof shareTokenPayloadSchema>;
export type ShareCreateRequest = z.infer<typeof shareCreateRequestSchema>;
export type FileRequestLink = z.infer<typeof fileRequestLinkSchema>;
export type AccessRequestRecord = z.infer<typeof accessRequestRecordSchema>;
export type AppShareTokenRequest = z.infer<typeof shareTokenRequestSchema>;

function parseSchemaValue<T>(raw: unknown, schema: z.ZodType<T>): T | null {
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

export function parseFileRequestLink(value: unknown): FileRequestLink | null {
  return parseSchemaValue(value, fileRequestLinkSchema);
}

export function serializeFileRequestLink(
  value: FileRequestLink,
): FileRequestLink {
  return fileRequestLinkSchema.parse(value);
}

export function parseAccessRequestRecord(
  value: unknown,
): AccessRequestRecord | null {
  return parseSchemaValue(value, accessRequestRecordSchema);
}

export function serializeAccessRequestRecord(
  value: AccessRequestRecord,
): string {
  return JSON.stringify(accessRequestRecordSchema.parse(value));
}

export function parseShareCollectionItems(value: unknown) {
  return parseSchemaValue(value, shareCollectionItemsSchema);
}
