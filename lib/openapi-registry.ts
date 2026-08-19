import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { appConfigSchema } from "@/lib/app-config.shared";

extendZodWithOpenApi(z);

/* ------------------------------------------------------------------ */
/*  Registry                                                          */
/* ------------------------------------------------------------------ */
const registry = new OpenAPIRegistry();

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Reusable component schemas                                        */
/* ------------------------------------------------------------------ */

const ZeeFileSchema = z.object({
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

const ShareLinkSchema = z.object({
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

const HealthResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
  timestamp: z.string(),
  services: z.object({
    database: z.string(),
    cache: z.string(),
    google_drive: z.string(),
  }),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

const PaginatedFilesSchema = z.object({
  files: z.array(ZeeFileSchema),
  nextPageToken: z.string().nullable(),
});

const FilesQuerySchema = z.object({
  folderId: z.string().optional(),
  pageToken: z.string().optional(),
  pageSize: z.coerce.number().optional(),
  shareToken: z.string().optional(),
});

const ShareCreateBodySchema = z.object({
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

const ShareCreateResponseSchema = z.object({
  shareableUrl: z.string(),
  token: z.string(),
  newShareLink: ShareLinkSchema,
});

const DeleteBodySchema = z.object({
  fileId: z.string().min(1),
});

const RenameBodySchema = z.object({
  fileId: z.string().min(1),
  newName: z.string().min(1),
});

const MoveBodySchema = z.object({
  fileId: z.string().min(1),
  targetFolderId: z.string().min(1),
});

const CopyBodySchema = z.object({
  fileId: z.string().min(1),
  targetFolderId: z.string().min(1),
});

const TwoFactorGenerateResponseSchema = z.object({
  secret: z.string(),
  qrCodeDataURL: z.string(),
});

const TwoFactorVerifyBodySchema = z.object({
  token: z.string().min(1),
});

const TwoFactorVerifyLoginBodySchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
});

const TwoFactorStatusResponseSchema = z.object({
  enabled: z.boolean(),
});

export const TwoFactorDisableBodySchema = z.object({
  token: z.string().min(1),
});

const AppConfigResponseSchema = appConfigSchema
  .omit({ localStoragePassword: true })
  .extend({
    localStoragePassword: z.literal(""),
  });

const ShareLinkListResponseSchema = z.array(ShareLinkSchema);

const FileUploadQuerySchema = z.object({
  type: z.enum(["init", "chunk"]),
  uploadUrl: z.string().url().optional(),
  parentId: z.string().optional(),
});

const FileUpdateBodySchema = z.object({
  fileId: z.string().min(1),
  newContent: z.string(),
});

const BulkDeleteBodySchema = z.object({
  fileIds: z.array(z.string().min(1)),
  parentId: z.string().min(1),
});

const BulkMoveBodySchema = z.object({
  fileIds: z.array(z.string().min(1)),
  currentParentId: z.string().min(1),
  newParentId: z.string().min(1),
});

const CreateFolderBodySchema = z.object({
  folderName: z.string().min(1),
  parentId: z.string().min(1),
});

const BulkDownloadBodySchema = z.object({
  fileIds: z.array(z.string().min(1)).min(1).max(20),
});

const FolderPathResponseSchema = z.array(
  z.object({ id: z.string(), name: z.string() }),
);

const ArchivePreviewResponseSchema = z.array(
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

/* ------------------------------------------------------------------ */
/*  Paths — Health                                                    */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/health",
  tags: ["Health"],
  summary: "Health check",
  responses: {
    200: {
      description: "Service health status",
      content: { "application/json": { schema: HealthResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Files                                                     */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/files",
  tags: ["Files"],
  summary: "List files in a folder",
  description:
    "Returns a paginated list of files and folders. Optionally accepts a shareToken for shared access.",
  request: {
    query: FilesQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated file list",
      content: { "application/json": { schema: PaginatedFilesSchema } },
    },
    400: {
      description: "Invalid query parameters",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/files/delete",
  tags: ["Files"],
  summary: "Delete a file",
  description:
    "Permanently deletes a file from Google Drive or local storage. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: DeleteBodySchema } },
    },
  },
  responses: {
    200: {
      description: "File deleted successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid request body",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/files/rename",
  tags: ["Files"],
  summary: "Rename a file",
  description: "Renames a file or folder in the storage backend. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: RenameBodySchema } },
    },
  },
  responses: {
    200: {
      description: "File renamed successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid request body",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/files/move",
  tags: ["Files"],
  summary: "Move a file",
  description: "Moves a file to a different folder. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: MoveBodySchema } },
    },
  },
  responses: {
    200: {
      description: "File moved successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid request body",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/files/copy",
  tags: ["Files"],
  summary: "Copy a file",
  description: "Creates a copy of a file in the target folder. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: CopyBodySchema } },
    },
  },
  responses: {
    200: {
      description: "File copied successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid request body",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Share                                                     */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/share/list",
  tags: ["Share"],
  summary: "List all share links",
  description: "Returns all share links. Admin only.",
  responses: {
    200: {
      description: "List of share links",
      content: { "application/json": { schema: ShareLinkListResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/share",
  tags: ["Share"],
  summary: "Create a share link",
  description:
    "Creates a new timed or session share link for a file or collection of files. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: ShareCreateBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Share link created",
      content: {
        "application/json": { schema: ShareCreateResponseSchema },
      },
    },
    400: {
      description: "Invalid request body",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Auth / 2FA                                                */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/auth/2fa/generate",
  tags: ["Auth"],
  summary: "Generate 2FA secret",
  description:
    "Generates a new TOTP secret and returns it along with a QR code data URL. Requires authentication.",
  responses: {
    200: {
      description: "2FA secret and QR code",
      content: {
        "application/json": { schema: TwoFactorGenerateResponseSchema },
      },
    },
    401: {
      description: "Unauthenticated",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/2fa/verify",
  tags: ["Auth"],
  summary: "Verify and enable 2FA",
  description:
    "Verifies the TOTP token against the temporary secret and enables 2FA for the user.",
  request: {
    body: {
      content: { "application/json": { schema: TwoFactorVerifyBodySchema } },
    },
  },
  responses: {
    200: {
      description: "2FA enabled successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid token",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthenticated",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/2fa/verify-login",
  tags: ["Auth"],
  summary: "Verify 2FA during login",
  description: "Verifies a TOTP token during the login flow.",
  request: {
    body: {
      content: {
        "application/json": { schema: TwoFactorVerifyLoginBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Token verified",
      content: {
        "application/json": {
          schema: z.object({ verified: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid token or email",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/2fa/disable",
  tags: ["Auth"],
  summary: "Disable 2FA",
  description: "Disables two-factor authentication for the current user.",
  request: {
    body: {
      content: {
        "application/json": { schema: TwoFactorDisableBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "2FA disabled",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid token",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/2fa/status",
  tags: ["Auth"],
  summary: "Get 2FA status",
  description: "Returns whether 2FA is enabled for the current user.",
  responses: {
    200: {
      description: "2FA status",
      content: {
        "application/json": { schema: TwoFactorStatusResponseSchema },
      },
    },
    401: {
      description: "Unauthenticated",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Admin / Config                                             */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/admin/config",
  tags: ["Admin"],
  summary: "Get app configuration",
  description: "Returns the full application configuration. Admin only.",
  responses: {
    200: {
      description: "App configuration",
      content: { "application/json": { schema: AppConfigResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/config",
  tags: ["Admin"],
  summary: "Update app configuration",
  description: "Updates application configuration values. Admin only.",
  request: {
    body: {
      content: {
        "application/json": { schema: appConfigSchema.partial() },
      },
    },
  },
  responses: {
    200: {
      description: "Updated configuration",
      content: { "application/json": { schema: AppConfigResponseSchema } },
    },
    400: {
      description: "Invalid configuration",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Files — Upload                                             */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/files/upload",
  tags: ["Files"],
  summary: "Upload a file",
  description:
    "Uploads files via resumable upload (init + chunk phases). Editor or Admin only.",
  request: {
    query: FileUploadQuerySchema,
  },
  responses: {
    200: {
      description: "Upload URL (init) or completion status (chunk)",
      content: {
        "application/json": {
          schema: z
            .object({
              uploadUrl: z.string().optional(),
              status: z.string().optional(),
              file: z.any().optional(),
            })
            .or(z.object({ status: z.literal("partial") })),
        },
      },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Files — Update                                             */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/files/update",
  tags: ["Files"],
  summary: "Update file content",
  description:
    "Overwrites the content of an existing file in Google Drive. Editor or Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: FileUpdateBodySchema } },
    },
  },
  responses: {
    200: {
      description: "File updated successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), file: z.any() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/files/update-media",
  tags: ["Files"],
  summary: "Update file media content",
  description:
    "Updates a file's binary content via multipart/form-data. Admin only.",
  request: {},
  responses: {
    200: {
      description: "Media updated successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    400: {
      description: "Missing file or fileId",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Files — Bulk Operations                                    */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/files/bulk-delete",
  tags: ["Files"],
  summary: "Bulk delete files",
  description:
    "Permanently deletes multiple files from Google Drive. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: BulkDeleteBodySchema } },
    },
  },
  responses: {
    200: {
      description: "All files deleted",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    207: {
      description: "Partial success — some files failed to delete",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/files/bulk-move",
  tags: ["Files"],
  summary: "Bulk move files",
  description:
    "Moves multiple files to a different folder. Editor or Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: BulkMoveBodySchema } },
    },
  },
  responses: {
    200: {
      description: "All files moved successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    207: {
      description: "Partial success — some files failed to move",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Files — Folder Create / Revisions                          */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/folder/create",
  tags: ["Files"],
  summary: "Create a folder",
  description: "Creates a new folder in Google Drive. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: CreateFolderBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Folder created successfully",
      content: {
        "application/json": { schema: z.any() },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/files/{fileId}/revisions",
  tags: ["Files"],
  summary: "List file revisions",
  description: "Returns revision history for a file. Admin only.",
  request: {
    params: z.object({ fileId: z.string() }),
  },
  responses: {
    200: {
      description: "List of revisions",
      content: {
        "application/json": { schema: z.any() },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Download                                                   */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/download",
  tags: ["Download"],
  summary: "Download or stream a file",
  description:
    "Downloads or streams a file from storage. Supports range requests for video streaming and optional PDF export.",
  request: {
    query: z.object({
      fileId: z.string().optional(),
      export: z.string().optional(),
      preview: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "File binary stream",
      content: { "application/octet-stream": { schema: z.string() } },
    },
    400: {
      description: "Bad request (folder download not supported)",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "File not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "head",
  path: "/api/download",
  tags: ["Download"],
  summary: "Download request headers",
  description:
    "Returns response headers for a download without the file body. Used for range checks.",
  request: {
    query: z.object({
      fileId: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Headers only, no body",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/bulk-download",
  tags: ["Download"],
  summary: "Bulk download as ZIP",
  description:
    "Downloads multiple files as a single ZIP archive. Max 20 files.",
  request: {
    body: {
      content: { "application/json": { schema: BulkDownloadBodySchema } },
    },
  },
  responses: {
    200: {
      description: "ZIP archive binary",
      content: { "application/zip": { schema: z.string() } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — File Details & Preview                                     */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/filedetails",
  tags: ["Files"],
  summary: "Get file details",
  description: "Returns detailed metadata for a specific file by ID.",
  request: {
    query: z.object({
      fileId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "File details",
      content: { "application/json": { schema: ZeeFileSchema } },
    },
    400: {
      description: "Missing fileId parameter",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Access denied",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/folderpath",
  tags: ["Files"],
  summary: "Get folder breadcrumb path",
  description:
    "Returns the hierarchical breadcrumb path from root to the specified folder.",
  request: {
    query: z.object({
      folderId: z.string(),
      locale: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Folder path breadcrumbs",
      content: {
        "application/json": { schema: FolderPathResponseSchema },
      },
    },
    400: {
      description: "Missing folderId parameter",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/metadata",
  tags: ["Files"],
  summary: "Get media metadata",
  description: "Looks up TMDB metadata for a media file by filename.",
  request: {
    query: z.object({
      filename: z.string(),
    }),
  },
  responses: {
    200: {
      description: "TMDB metadata",
      content: { "application/json": { schema: z.any() } },
    },
    400: {
      description: "Filename is required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/proxy-image",
  tags: ["Files"],
  summary: "Proxy and process images",
  description:
    "Fetches, resizes, and converts images to WebP format with configurable quality. Only allowed from Google hosts.",
  request: {
    query: z.object({
      url: z.string(),
      w: z.coerce.number().optional(),
      h: z.coerce.number().optional(),
      q: z.coerce.number().optional(),
    }),
  },
  responses: {
    200: {
      description: "Processed WebP image",
      content: { "image/webp": { schema: z.string() } },
    },
    400: {
      description: "Missing url parameter",
    },
    500: {
      description: "Internal server error",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/archive-preview",
  tags: ["Files"],
  summary: "Preview archive contents",
  description:
    "Lists the contents of a ZIP archive file without downloading it.",
  request: {
    query: z.object({
      fileId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Archive file listing",
      content: {
        "application/json": { schema: ArchivePreviewResponseSchema },
      },
    },
    400: {
      description: "Missing fileId parameter",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Access denied",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/events",
  tags: ["Files"],
  summary: "Server-sent events",
  description:
    "Opens an SSE (Server-Sent Events) stream for real-time activity notifications.",
  responses: {
    200: {
      description: "SSE event stream (text/event-stream)",
      content: { "text/event-stream": { schema: z.string() } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Auth (non-2FA)                                             */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/auth/me",
  tags: ["Auth"],
  summary: "Get current user",
  description:
    "Returns the authenticated user's session data, or null if not authenticated.",
  responses: {
    200: {
      description: "User session or null",
      content: {
        "application/json": {
          schema: z.object({ user: z.any().nullable() }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/status",
  tags: ["Auth"],
  summary: "Authentication status",
  description: "Checks Google Drive authentication health status.",
  responses: {
    200: {
      description: "Auth health status",
      content: {
        "application/json": {
          schema: z.object({
            status: z.string(),
            error: z.string().optional(),
          }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/folder",
  tags: ["Auth"],
  summary: "Authenticate folder access",
  description:
    "Validates folder password protection credentials and returns a JWT token for folder access.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            folderId: z.string().min(1),
            id: z.string().min(1),
            password: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Authentication successful",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), token: z.string() }),
        },
      },
    },
    401: {
      description: "Invalid credentials",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Folder not configured for password protection",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    429: {
      description: "Rate limit exceeded",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/local/check",
  tags: ["Auth"],
  summary: "Check local storage auth status",
  description:
    "Checks whether the user has an active local storage authentication session.",
  responses: {
    200: {
      description: "Auth status",
      content: {
        "application/json": {
          schema: z.object({ authenticated: z.boolean() }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/local/unlock",
  tags: ["Auth"],
  summary: "Unlock local storage",
  description:
    "Authenticates with a password to unlock local storage access. Returns a session cookie.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ password: z.string().min(1) }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Unlock successful",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    401: {
      description: "Invalid password",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    503: {
      description: "Server auth secret not configured",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/local/logout",
  tags: ["Auth"],
  summary: "Logout from local storage",
  description: "Clears the local storage authentication cookie.",
  responses: {
    200: {
      description: "Logged out",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/profile/password",
  tags: ["Auth"],
  summary: "Change password",
  description:
    "Changes the authenticated user's password. Requires current password verification.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            currentPassword: z.string().min(1),
            newPassword: z.string().min(6),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password updated",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    400: {
      description: "Current password is incorrect",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Configuration                                              */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/config",
  tags: ["Config"],
  summary: "Get public configuration",
  description: "Returns the public application configuration.",
  responses: {
    200: {
      description: "Public app configuration",
      content: { "application/json": { schema: z.any() } },
    },
    500: {
      description: "Failed to fetch config",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/config/public",
  tags: ["Config"],
  summary: "Get public configuration (alias)",
  description:
    "Returns the public application configuration. Alias for /api/config.",
  responses: {
    200: {
      description: "Public app configuration",
      content: { "application/json": { schema: z.any() } },
    },
    500: {
      description: "Failed to fetch config",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/clearcache",
  tags: ["Config"],
  summary: "Clear server cache",
  description: "Clears the server-side cache for a given target. Admin only.",
  request: {
    query: z.object({
      target: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Cache cleared",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    400: {
      description: "Invalid cache target",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Setup                                                      */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/setup/finish",
  tags: ["Setup"],
  summary: "Complete initial setup",
  description:
    "Finishes the initial OAuth setup by exchanging the auth code for a refresh token and saving configuration.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            clientId: z.string().min(1),
            clientSecret: z.string().min(1),
            authCode: z.string().min(1),
            redirectUri: z.string().url(),
            rootFolderId: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Setup completed",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            restartNeeded: z.boolean(),
            manualConfigNeeded: z.boolean(),
            manualConfigData: z.any().nullable(),
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: "Invalid configuration or token exchange failed",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Misc                                                       */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/manual-drives",
  tags: ["Misc"],
  summary: "List manual drives",
  description:
    "Returns the list of manually configured drives (public, no auth required).",
  responses: {
    200: {
      description: "Manual drives list",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              id: z.string(),
              name: z.string().optional(),
              isProtected: z.boolean().optional(),
            }),
          ),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/datausage",
  tags: ["Misc"],
  summary: "Get storage data usage",
  description: "Returns the total storage usage in bytes.",
  responses: {
    200: {
      description: "Storage usage",
      content: {
        "application/json": {
          schema: z.object({ totalUsage: z.number() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/storage-details",
  tags: ["Misc"],
  summary: "Get storage details",
  description:
    "Returns detailed storage information including largest files and usage breakdown. User or above.",
  responses: {
    200: {
      description: "Storage details",
      content: { "application/json": { schema: z.any() } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Share — Details / Status / Delete / Revoke                 */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "patch",
  path: "/api/share/{id}",
  tags: ["Share"],
  summary: "Update share link",
  description: "Updates an existing share link's settings. Admin only.",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            loginRequired: z.boolean().optional(),
            maxUses: z.number().nullable().optional(),
            preventDownload: z.boolean().optional(),
            hasWatermark: z.boolean().optional(),
            watermarkText: z.string().nullable().optional(),
            expiresAt: z.string().datetime().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Share link updated",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            updatedShareLink: ShareLinkSchema,
          }),
        },
      },
    },
    404: {
      description: "Share link not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/share/status",
  tags: ["Share"],
  summary: "Check share token status",
  description:
    "Validates whether a share token is still active and not revoked.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ shareToken: z.string().min(1) }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token validity status",
      content: {
        "application/json": {
          schema: z.object({
            valid: z.boolean(),
            error: z.string().optional(),
          }),
        },
      },
    },
    400: {
      description: "Invalid token",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/share/delete",
  tags: ["Share"],
  summary: "Delete share link",
  description:
    "Permanently deletes a share link and blocks its token. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().min(1),
            jti: z.string().min(1),
            expiresAt: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Share link deleted",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/share/revoke",
  tags: ["Share"],
  summary: "Revoke share link",
  description: "Revokes a share link by blocking its JWT token. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            jti: z.string().min(1),
            expiresAt: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Share link revoked",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/share/track",
  tags: ["Share"],
  summary: "Track share link view",
  description:
    "Increments the view counter for a share link. Returns 204 No Content.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ shareToken: z.string().min(1) }),
        },
      },
    },
  },
  responses: {
    204: {
      description: "View tracked (no content)",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/share/items/{shareId}",
  tags: ["Share"],
  summary: "Get share collection items",
  description:
    "Returns the items in a share collection, validated by share token.",
  request: {
    params: z.object({ shareId: z.string() }),
    query: z.object({ share_token: z.string() }),
  },
  responses: {
    200: {
      description: "Collection items",
      content: {
        "application/json": {
          schema: z.object({ items: z.any(), collectionName: z.string() }),
        },
      },
    },
    401: {
      description: "Missing or invalid token",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Token revoked or mismatched",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Collection not found or expired",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Trash                                                      */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/trash",
  tags: ["Trash"],
  summary: "List trashed files",
  description: "Returns files in the Google Drive trash. Admin only.",
  responses: {
    200: {
      description: "Trashed files list",
      content: { "application/json": { schema: z.any() } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/trash",
  tags: ["Trash"],
  summary: "Restore from trash",
  description: "Restores a file or multiple files from the trash. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            fileId: z.string().optional(),
            fileIds: z.array(z.string()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Files restored",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/trash",
  tags: ["Trash"],
  summary: "Delete permanently from trash",
  description:
    "Permanently deletes a file or multiple files from the trash. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            fileId: z.string().optional(),
            fileIds: z.array(z.string()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Files permanently deleted",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Search                                                     */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/search",
  tags: ["Search"],
  summary: "Search files",
  description:
    "Searches files in Google Drive by name, mimeType, date range, or size.",
  request: {
    query: z.object({
      q: z.string().optional(),
      folderId: z.string().optional(),
      searchType: z.string().optional(),
      mimeType: z.string().optional(),
      modifiedTime: z.string().optional(),
      minSize: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Search results",
      content: {
        "application/json": {
          schema: z.object({
            files: z.array(z.any()),
            nextPageToken: z.string().nullable(),
          }),
        },
      },
    },
    400: {
      description: "Search criteria required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/search/global",
  tags: ["Search"],
  summary: "Global search across all drives",
  description:
    "Searches across all descendant folders and merged index results.",
  request: {
    query: z.object({
      q: z.string().optional(),
      searchType: z.string().optional(),
      mimeType: z.string().optional(),
      modifiedTime: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Global search results",
      content: {
        "application/json": {
          schema: z.object({ files: z.array(z.any()) }),
        },
      },
    },
    400: {
      description: "Search term required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — File Request                                               */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/file-request",
  tags: ["File Request"],
  summary: "Create file request",
  description: "Creates a public file upload request link. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            folderId: z.string().min(1),
            folderName: z.string().min(1),
            title: z.string().min(1),
            expiresIn: z.number().int().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "File request created",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            token: z.string(),
            publicUrl: z.string(),
          }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/file-request",
  tags: ["File Request"],
  summary: "List file requests",
  description: "Returns all active file request links. Admin only.",
  responses: {
    200: {
      description: "Active file requests",
      content: { "application/json": { schema: z.array(z.any()) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/file-request",
  tags: ["File Request"],
  summary: "Delete file request",
  description: "Deletes a file request link by token. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ token: z.string().min(1) }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "File request deleted",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/file-request/{token}",
  tags: ["File Request"],
  summary: "Get file request info",
  description: "Returns file request details by token (public).",
  request: {
    params: z.object({ token: z.string() }),
  },
  responses: {
    200: {
      description: "File request details",
      content: {
        "application/json": {
          schema: z.object({
            title: z.string(),
            folderName: z.string(),
            expiresAt: z.number(),
            folderId: z.string(),
          }),
        },
      },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    410: {
      description: "Expired",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/file-request/upload",
  tags: ["File Request"],
  summary: "Upload to file request",
  description:
    "Uploads a file via a public file request link using resumable upload (init + chunk phases).",
  request: {
    query: z.object({
      type: z.enum(["init", "chunk"]),
      token: z.string().min(1),
      uploadUrl: z.string().url().optional(),
    }),
  },
  responses: {
    200: {
      description: "Upload URL (init) or completion status (chunk)",
      content: {
        "application/json": {
          schema: z.any(),
        },
      },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Invalid or expired token",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Request Access                                             */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/request-access",
  tags: ["Request Access"],
  summary: "Request folder access",
  description:
    "Sends an access request for a protected folder to the admin. User or above (non-guest).",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            folderId: z.string().min(1),
            folderName: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Access request sent",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    400: {
      description: "User email not available",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Guests cannot request access",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Cron                                                       */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/cron/activity-cleanup",
  tags: ["Cron"],
  summary: "Cleanup old activity logs",
  description:
    "Deletes old activity log entries. Requires CRON_SECRET Bearer token.",
  responses: {
    200: {
      description: "Cleanup result",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            deletedCount: z.number(),
            message: z.string(),
          }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/cron/incident-monitor",
  tags: ["Cron"],
  summary: "Run incident monitor",
  description:
    "Evaluates incident detection rules. Requires CRON_SECRET Bearer token.",
  responses: {
    200: {
      description: "Evaluation summary",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), summary: z.any() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/cron/storage-check",
  tags: ["Cron"],
  summary: "Check storage limits",
  description:
    "Checks storage usage against configured limits and sends warnings. Requires CRON_SECRET Bearer token.",
  responses: {
    200: {
      description: "Storage check result",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/cron/weekly-report",
  tags: ["Cron"],
  summary: "Generate weekly report",
  description:
    "Generates and emails a weekly activity report. Requires CRON_SECRET Bearer token.",
  responses: {
    200: {
      description: "Report generation result",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Admin — Analytics / Activity / Audit / Cache               */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/admin/analytics",
  tags: ["Admin"],
  summary: "Get analytics data",
  description:
    "Returns analytics data including page views and bandwidth. Admin only.",
  responses: {
    200: {
      description: "Analytics data",
      content: { "application/json": { schema: z.any() } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/analytics/enhanced",
  tags: ["Admin"],
  summary: "Get enhanced analytics",
  description:
    "Returns detailed analytics with daily trends, peak hours, engagement stats, and security events. Admin only.",
  responses: {
    200: {
      description: "Enhanced analytics data",
      content: { "application/json": { schema: z.any() } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/activity-log",
  tags: ["Admin"],
  summary: "Get activity logs",
  description: "Returns paginated activity log entries. Admin only.",
  request: {
    query: z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(50),
    }),
  },
  responses: {
    200: {
      description: "Paginated activity logs",
      content: {
        "application/json": {
          schema: z.object({
            logs: z.array(z.any()),
            totalPages: z.number(),
            currentPage: z.number(),
            totalLogs: z.number(),
          }),
        },
      },
    },
    400: {
      description: "Invalid query parameters",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/audit",
  tags: ["Admin"],
  summary: "Get audit trail",
  description: "Returns the security audit trail. Admin only.",
  responses: {
    200: {
      description: "Audit log entries",
      content: { "application/json": { schema: z.array(z.any()) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/audit",
  tags: ["Admin"],
  summary: "Clear audit logs",
  description: "Deletes all activity logs. Admin only.",
  responses: {
    200: {
      description: "Logs cleared",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/cache-stats",
  tags: ["Admin"],
  summary: "Get cache statistics",
  description:
    "Returns KV cache hit/miss statistics and size information. Admin only.",
  responses: {
    200: {
      description: "Cache statistics",
      content: {
        "application/json": {
          schema: z.object({
            cacheStats: z.any(),
            timestamp: z.string(),
            info: z.any(),
          }),
        },
      },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Admin — Editors / Users                                    */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/admin/editors",
  tags: ["Admin"],
  summary: "List editors",
  description: "Returns a list of editor email addresses. Admin only.",
  responses: {
    200: {
      description: "Editor emails",
      content: { "application/json": { schema: z.array(z.string()) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/editors",
  tags: ["Admin"],
  summary: "Add editor",
  description: "Adds a user as editor by email. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ email: z.string().email() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Editor added",
      content: {
        "application/json": {
          schema: z.object({ message: z.string(), email: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/editors",
  tags: ["Admin"],
  summary: "Remove editor",
  description: "Removes a user from the editor role. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ email: z.string().email() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Editor removed",
      content: {
        "application/json": {
          schema: z.object({ message: z.string(), email: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/users",
  tags: ["Admin"],
  summary: "List admin users",
  description: "Returns a list of admin email addresses. Admin only.",
  responses: {
    200: {
      description: "Admin emails",
      content: { "application/json": { schema: z.array(z.string()) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/users",
  tags: ["Admin"],
  summary: "Add admin user",
  description: "Adds a user as admin by email. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ email: z.string().email() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Admin added",
      content: {
        "application/json": {
          schema: z.object({ message: z.string(), email: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/users",
  tags: ["Admin"],
  summary: "Remove admin user",
  description: "Removes a user from the admin role. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ email: z.string().email() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Admin removed",
      content: {
        "application/json": {
          schema: z.object({ message: z.string(), email: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Admin — Incidents                                          */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/admin/incidents",
  tags: ["Admin"],
  summary: "List incidents",
  description: "Returns a paginated list of system incidents. Admin only.",
  request: {
    query: z.object({
      limit: z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
      status: z.string().optional().default("all"),
    }),
  },
  responses: {
    200: {
      description: "Paginated incidents",
      content: {
        "application/json": {
          schema: z.object({
            incidents: z.any(),
            total: z.number(),
            openCount: z.number(),
          }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/incidents",
  tags: ["Admin"],
  summary: "Update incident status",
  description: "Updates the status of a system incident. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().min(1),
            status: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Incident updated",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), incident: z.any() }),
        },
      },
    },
    404: {
      description: "Incident not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/incidents/evaluate",
  tags: ["Admin"],
  summary: "Evaluate incident rules",
  description: "Manually triggers incident rule evaluation. Admin only.",
  responses: {
    200: {
      description: "Evaluation summary",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), summary: z.any() }),
        },
      },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Admin — Stats / System Health                              */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/admin/stats",
  tags: ["Admin"],
  summary: "Get admin statistics",
  description:
    "Returns admin dashboard statistics including downloads, top files, and bandwidth. Admin only.",
  responses: {
    200: {
      description: "Admin statistics",
      content: { "application/json": { schema: z.any() } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/system-health",
  tags: ["Admin"],
  summary: "Get system health",
  description: "Returns system health status for all services. Admin only.",
  responses: {
    200: {
      description: "System health status",
      content: {
        "application/json": {
          schema: z.object({
            status: z.string(),
            services: z.any(),
            errorRate: z.any(),
            latency: z.any(),
            timestamp: z.string(),
          }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/storage/test",
  tags: ["Admin"],
  summary: "Test storage connection",
  description:
    "Tests the connection to the configured external storage provider. Admin only.",
  responses: {
    200: {
      description: "Connection test result",
      content: {
        "application/json": {
          schema: z.object({
            ok: z.boolean(),
            provider: z.string().optional(),
            message: z.string().optional(),
            error: z.string().optional(),
          }),
        },
      },
    },
    400: {
      description: "No external provider configured",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    502: {
      description: "Connection failed",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Admin — User Access / Access Requests                      */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/admin/user-access",
  tags: ["Admin"],
  summary: "List folder access permissions",
  description:
    "Returns a map of folder IDs to allowed email addresses. Admin only.",
  responses: {
    200: {
      description: "Folder access permissions",
      content: {
        "application/json": {
          schema: z.record(z.string(), z.array(z.string())),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/user-access",
  tags: ["Admin"],
  summary: "Grant folder access",
  description: "Grants a user access to a protected folder. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            folderId: z.string().min(5),
            email: z.string().email(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Access granted",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/user-access",
  tags: ["Admin"],
  summary: "Revoke folder access",
  description: "Revokes a user's access to a protected folder. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            folderId: z.string().min(5),
            email: z.string().email(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Access revoked",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/access-requests",
  tags: ["Admin"],
  summary: "List access requests",
  description: "Returns all pending folder access requests. Admin only.",
  responses: {
    200: {
      description: "Access requests",
      content: { "application/json": { schema: z.array(z.any()) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/access-requests",
  tags: ["Admin"],
  summary: "Approve or reject access request",
  description: "Approves or rejects a folder access request. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            action: z.enum(["approve", "reject"]),
            requestData: z.any(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Request processed",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Admin — Logs                                               */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/admin/logs",
  tags: ["Admin"],
  summary: "Get system logs",
  description:
    "Returns paginated activity logs from the event pipeline. Admin only.",
  request: {
    query: z.object({
      offset: z.coerce.number().optional(),
    }),
  },
  responses: {
    200: {
      description: "Paginated logs",
      content: {
        "application/json": {
          schema: z.object({ logs: z.array(z.any()), hasMore: z.boolean() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/logs/security",
  tags: ["Admin"],
  summary: "Get security event logs",
  description: "Returns recent security-related log entries. Admin only.",
  responses: {
    200: {
      description: "Security logs",
      content: { "application/json": { schema: z.array(z.any()) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Admin — Invite / Protected Folders / Manual Drives         */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/admin/invite",
  tags: ["Admin"],
  summary: "Invite user",
  description: "Invites a user by email with a specified role. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            role: z.enum(["ADMIN", "EDITOR", "USER"]).default("USER"),
            password: z.string().min(6).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "User invited",
      content: {
        "application/json": {
          schema: z.object({ message: z.string(), user: z.any() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/protected-folders",
  tags: ["Admin"],
  summary: "List protected folders",
  description: "Returns all password-protected folders. Admin only.",
  responses: {
    200: {
      description: "Protected folders map",
      content: {
        "application/json": { schema: z.record(z.string(), z.any()) },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/protected-folders",
  tags: ["Admin"],
  summary: "Add protected folder",
  description: "Sets a folder password protection. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            folderId: z.string().min(5),
            id: z.string().optional(),
            password: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Folder protected",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    400: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/protected-folders",
  tags: ["Admin"],
  summary: "Remove protected folder",
  description: "Removes password protection from a folder. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ folderId: z.string().min(1) }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Protection removed",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/manual-drives",
  tags: ["Admin"],
  summary: "List manual drives (admin)",
  description: "Returns manual drives with full details. Admin only.",
  responses: {
    200: {
      description: "Manual drives list",
      content: { "application/json": { schema: z.array(z.any()) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/manual-drives",
  tags: ["Admin"],
  summary: "Add manual drive",
  description: "Adds a new manual drive configuration. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: z.any() } },
    },
  },
  responses: {
    200: {
      description: "Drive added",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), drives: z.any() }),
        },
      },
    },
    400: {
      description: "Duplicate or invalid",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/manual-drives",
  tags: ["Admin"],
  summary: "Delete manual drive",
  description: "Removes a manual drive configuration. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: z.any() } },
    },
  },
  responses: {
    200: {
      description: "Drive deleted",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), drives: z.any() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Admin — Reindex / Drives / User Password                   */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/admin/reindex",
  tags: ["Admin"],
  summary: "Reindex files",
  description: "Triggers a full reindex of the search index. Admin only.",
  responses: {
    200: {
      description: "Reindex started",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/drives/scan",
  tags: ["Admin"],
  summary: "Scan remote drives",
  description:
    "Scans for shared drives and shared-with-me folders. Admin only.",
  responses: {
    200: {
      description: "Discovered drives and folders",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              kind: z.string(),
              owner: z.string().optional(),
            }),
          ),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/user-password",
  tags: ["Admin"],
  summary: "Check user password status",
  description: "Checks whether a user has a password set. Admin only.",
  request: {
    query: z.object({
      email: z.string().email(),
    }),
  },
  responses: {
    200: {
      description: "Password status",
      content: {
        "application/json": {
          schema: z.object({ email: z.string(), hasPassword: z.boolean() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/user-password",
  tags: ["Admin"],
  summary: "Set user password",
  description: "Sets or updates a user's password. Admin only.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            password: z.string().min(8),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password set",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/user-password",
  tags: ["Admin"],
  summary: "Remove user password",
  description: "Removes a user's password. Admin only.",
  request: {
    query: z.object({
      email: z.string().email(),
    }),
  },
  responses: {
    200: {
      description: "Password removed",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Generate document                                                  */
/* ------------------------------------------------------------------ */

export function getOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Zee-Index API",
      version: "1.0.0",
      description:
        "REST API for Zee-Index — a self-hosted Google Drive Explorer, CMS & streaming platform. All authenticated routes use NextAuth.js JWT sessions. Admin routes require ADMIN or EDITOR role.",
    },
    servers: [
      {
        url: "/",
        description: "Same-origin (use relative paths)",
      },
    ],
    tags: [
      { name: "Health", description: "Service health checks" },
      { name: "Files", description: "File and folder operations" },
      { name: "Download", description: "File download and streaming" },
      { name: "Share", description: "Share link management" },
      { name: "Trash", description: "Trash management" },
      { name: "Search", description: "File search" },
      { name: "Auth", description: "Authentication & 2FA" },
      { name: "Config", description: "Application configuration" },
      { name: "Setup", description: "Initial setup wizard" },
      { name: "Misc", description: "Miscellaneous endpoints" },
      { name: "Admin", description: "Administration endpoints" },
      { name: "File Request", description: "Public file upload requests" },
      { name: "Request Access", description: "Folder access requests" },
      { name: "Cron", description: "Scheduled task endpoints" },
    ],
  });
}
