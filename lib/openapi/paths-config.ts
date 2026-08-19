import { z } from "zod";
import { registry, ErrorResponseSchema } from "./schemas";

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
