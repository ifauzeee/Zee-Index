import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { appConfigSchema } from "@/lib/app-config.shared";
import type { ZeeFile } from "@/types/storage";

/* ------------------------------------------------------------------ */
/*  Registry                                                          */
/* ------------------------------------------------------------------ */
const registry = new OpenAPIRegistry();

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                   */
/* ------------------------------------------------------------------ */

/** Convert a Zod schema to an OpenAPI schema object via the generator. */
function toSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const gen = new OpenApiGeneratorV3([{ type: "schema", schema }]);
  const doc = gen.generateDocument({
    openapi: "3.0.3",
    info: { title: "internal", version: "0.0.0" },
  });
  const ref = doc.components?.schemas?.["default"] as
    | Record<string, unknown>
    | undefined;
  return ref ?? {};
}

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
      { name: "Share", description: "Share link management" },
      { name: "Auth", description: "Authentication & 2FA" },
      { name: "Admin", description: "Administration endpoints" },
    ],
  });
}
