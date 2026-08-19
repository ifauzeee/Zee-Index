import { z } from "zod";
import { registry, ErrorResponseSchema } from "./schemas";

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
