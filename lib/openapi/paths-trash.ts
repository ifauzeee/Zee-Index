import { z } from "zod";
import { registry, ErrorResponseSchema } from "./schemas";

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
