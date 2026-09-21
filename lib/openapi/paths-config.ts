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

/* ------------------------------------------------------------------ */
