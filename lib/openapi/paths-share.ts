import { z } from "zod";
import {
  registry,
  ErrorResponseSchema,
  ShareCreateBodySchema,
  ShareCreateResponseSchema,
  ShareLinkListResponseSchema,
  ShareLinkSchema,
} from "./schemas";

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
