import { z } from "zod";
import { registry, ErrorResponseSchema } from "./schemas";

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
