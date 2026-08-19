import { z } from "zod";
import { registry, ErrorResponseSchema } from "./schemas";

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
