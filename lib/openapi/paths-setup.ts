import { z } from "zod";
import { registry, ErrorResponseSchema } from "./schemas";

/*  Paths — Setup                                                      */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/setup/finish",
  tags: ["Setup"],
  summary: "Complete initial setup",
  description:
    "Finishes the initial OAuth setup by exchanging the auth code for a refresh token and saving configuration.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            clientId: z.string().min(1),
            clientSecret: z.string().min(1),
            authCode: z.string().min(1),
            redirectUri: z.string().url(),
            rootFolderId: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Setup completed",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            restartNeeded: z.boolean(),
            manualConfigNeeded: z.boolean(),
            manualConfigData: z.any().nullable(),
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: "Invalid configuration or token exchange failed",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
