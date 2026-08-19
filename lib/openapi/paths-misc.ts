import { z } from "zod";
import { registry, ErrorResponseSchema } from "./schemas";

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
