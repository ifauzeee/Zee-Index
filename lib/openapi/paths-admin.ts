import { z } from "zod";
import { appConfigSchema } from "@/lib/app-config.shared";
import {
  registry,
  AppConfigResponseSchema,
  ErrorResponseSchema,
} from "./schemas";

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
