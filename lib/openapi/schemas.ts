import {
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { appConfigSchema } from "@/lib/app-config.shared";

extendZodWithOpenApi(z);

/* ------------------------------------------------------------------ */
/*  Registry                                                          */
/* ------------------------------------------------------------------ */
export const registry = new OpenAPIRegistry();

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Reusable component schemas                                        */
/* ------------------------------------------------------------------ */

export const ZeeFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  size: z.string().optional(),
  modifiedTime: z.string(),
  createdTime: z.string().optional(),
  isFolder: z.boolean(),
  source: z.enum(["google-drive", "local", "s3", "webdav"]),
  thumbnailLink: z.string().optional(),
  hasThumbnail: z.boolean(),
  webViewLink: z.string().optional(),
  webContentLink: z.string().optional(),
  parents: z.array(z.string()).optional(),
  path: z.string().optional(),
  trashed: z.boolean().optional(),
  isProtected: z.boolean().optional(),
  owners: z
    .array(
      z.object({
        displayName: z.string(),
        emailAddress: z.string(),
      }),
    )
    .optional(),
  lastModifyingUser: z.object({ displayName: z.string() }).optional(),
  imageMediaMetadata: z
    .object({ width: z.number(), height: z.number() })
    .optional(),
  videoMediaMetadata: z
    .object({
      width: z.number(),
      height: z.number(),
      durationMillis: z.string(),
    })
    .optional(),
  md5Checksum: z.string().optional(),
  shortcutDetails: z
    .object({ targetId: z.string(), targetMimeType: z.string() })
    .optional(),
});

export const ShareLinkSchema = z.object({
  id: z.string(),
  path: z.string(),
  token: z.string(),
  jti: z.string(),
  expiresAt: z.string(),
  loginRequired: z.boolean(),
  itemName: z.string(),
  viewCount: z.number().optional(),
  isCollection: z.boolean().optional(),
  maxUses: z.number().nullable().optional(),
  preventDownload: z.boolean().optional(),
  directDownload: z.boolean().optional(),
  hasWatermark: z.boolean().optional(),
  watermarkText: z.string().nullable().optional(),
});

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
  timestamp: z.string(),
  services: z.object({
    database: z.string(),
    cache: z.string(),
    google_drive: z.string(),
  }),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

export const PaginatedFilesSchema = z.object({
  files: z.array(ZeeFileSchema),
  nextPageToken: z.string().nullable(),
});

export const FilesQuerySchema = z.object({
  folderId: z.string().optional(),
  pageToken: z.string().optional(),
  pageSize: z.coerce.number().optional(),
  shareToken: z.string().optional(),
});

export const ShareCreateBodySchema = z.object({
  path: z.string().min(1),
  itemName: z.string().min(1),
  type: z.enum(["timed", "session"]),
  expiresIn: z.string().optional(),
  loginRequired: z.boolean().optional(),
  preventDownload: z.boolean().optional(),
  directDownload: z.boolean().optional(),
  hasWatermark: z.boolean().optional(),
  watermarkText: z.string().optional(),
  maxUses: z.number().optional(),
  items: z.array(ZeeFileSchema).optional(),
});

export const ShareCreateResponseSchema = z.object({
  shareableUrl: z.string(),
  token: z.string(),
  newShareLink: ShareLinkSchema,
});

export const DeleteBodySchema = z.object({
  fileId: z.string().min(1),
});

export const RenameBodySchema = z.object({
  fileId: z.string().min(1),
  newName: z.string().min(1),
});

export const MoveBodySchema = z.object({
  fileId: z.string().min(1),
  targetFolderId: z.string().min(1),
});

export const CopyBodySchema = z.object({
  fileId: z.string().min(1),
  targetFolderId: z.string().min(1),
});

export const TwoFactorGenerateResponseSchema = z.object({
  secret: z.string(),
  qrCodeDataURL: z.string(),
});

export const TwoFactorVerifyBodySchema = z.object({
  token: z.string().min(1),
});

export const TwoFactorVerifyLoginBodySchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
});

export const TwoFactorStatusResponseSchema = z.object({
  enabled: z.boolean(),
});

export const TwoFactorDisableBodySchema = z.object({
  token: z.string().min(1),
});

export const AppConfigResponseSchema = appConfigSchema
  .omit({ localStoragePassword: true })
  .extend({
    localStoragePassword: z.literal(""),
  });

export const ShareLinkListResponseSchema = z.array(ShareLinkSchema);

export const FileUploadQuerySchema = z.object({
  type: z.enum(["init", "chunk"]),
  uploadUrl: z.string().url().optional(),
  parentId: z.string().optional(),
});

export const FileUpdateBodySchema = z.object({
  fileId: z.string().min(1),
  newContent: z.string(),
});

export const BulkDeleteBodySchema = z.object({
  fileIds: z.array(z.string().min(1)),
  parentId: z.string().min(1),
});

export const BulkMoveBodySchema = z.object({
  fileIds: z.array(z.string().min(1)),
  currentParentId: z.string().min(1),
  newParentId: z.string().min(1),
});

export const CreateFolderBodySchema = z.object({
  folderName: z.string().min(1),
  parentId: z.string().min(1),
});

export const BulkDownloadBodySchema = z.object({
  fileIds: z.array(z.string().min(1)).min(1).max(20),
});

export const FolderPathResponseSchema = z.array(
  z.object({ id: z.string(), name: z.string() }),
);

export const ArchivePreviewResponseSchema = z.array(
  z.object({ name: z.string(), size: z.number(), isFolder: z.boolean() }),
);

/* ------------------------------------------------------------------ */
/*  Register all components                                            */
/* ------------------------------------------------------------------ */

registry.register("ZeeFile", ZeeFileSchema);
registry.register("ShareLink", ShareLinkSchema);
registry.register("HealthResponse", HealthResponseSchema);
registry.register("ErrorResponse", ErrorResponseSchema);
registry.register("PaginatedFiles", PaginatedFilesSchema);
registry.register("ShareCreateResponse", ShareCreateResponseSchema);
registry.register("TwoFactorGenerateResponse", TwoFactorGenerateResponseSchema);
registry.register("TwoFactorStatusResponse", TwoFactorStatusResponseSchema);
registry.register("AppConfig", AppConfigResponseSchema);
registry.register("ShareLinkList", ShareLinkListResponseSchema);
