import { z } from "zod";
import { registry, ErrorResponseSchema } from "./schemas";

/*  Paths — Request Access                                             */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/request-access",
  tags: ["Request Access"],
  summary: "Request folder access",
  description:
    "Sends an access request for a protected folder to the admin. User or above (non-guest).",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            folderId: z.string().min(1),
            folderName: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Access request sent",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    400: {
      description: "User email not available",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Guests cannot request access",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
