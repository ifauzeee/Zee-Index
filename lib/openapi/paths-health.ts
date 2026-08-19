import { registry, HealthResponseSchema } from "./schemas";

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
