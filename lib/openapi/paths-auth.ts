import { z } from "zod";
import {
  registry,
  ErrorResponseSchema,
  TwoFactorDisableBodySchema,
  TwoFactorGenerateResponseSchema,
  TwoFactorStatusResponseSchema,
  TwoFactorVerifyBodySchema,
  TwoFactorVerifyLoginBodySchema,
} from "./schemas";

/*  Paths — Auth / 2FA                                                */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/auth/2fa/generate",
  tags: ["Auth"],
  summary: "Generate 2FA secret",
  description:
    "Generates a new TOTP secret and returns it along with a QR code data URL. Requires authentication.",
  responses: {
    200: {
      description: "2FA secret and QR code",
      content: {
        "application/json": { schema: TwoFactorGenerateResponseSchema },
      },
    },
    401: {
      description: "Unauthenticated",
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
  path: "/api/auth/2fa/verify",
  tags: ["Auth"],
  summary: "Verify and enable 2FA",
  description:
    "Verifies the TOTP token against the temporary secret and enables 2FA for the user.",
  request: {
    body: {
      content: { "application/json": { schema: TwoFactorVerifyBodySchema } },
    },
  },
  responses: {
    200: {
      description: "2FA enabled successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid token",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthenticated",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/2fa/verify-login",
  tags: ["Auth"],
  summary: "Verify 2FA during login",
  description: "Verifies a TOTP token during the login flow.",
  request: {
    body: {
      content: {
        "application/json": { schema: TwoFactorVerifyLoginBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Token verified",
      content: {
        "application/json": {
          schema: z.object({ verified: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid token or email",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/2fa/disable",
  tags: ["Auth"],
  summary: "Disable 2FA",
  description: "Disables two-factor authentication for the current user.",
  request: {
    body: {
      content: {
        "application/json": { schema: TwoFactorDisableBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "2FA disabled",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid token",
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
  path: "/api/auth/2fa/status",
  tags: ["Auth"],
  summary: "Get 2FA status",
  description: "Returns whether 2FA is enabled for the current user.",
  responses: {
    200: {
      description: "2FA status",
      content: {
        "application/json": { schema: TwoFactorStatusResponseSchema },
      },
    },
    401: {
      description: "Unauthenticated",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Auth (non-2FA)                                             */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/auth/me",
  tags: ["Auth"],
  summary: "Get current user",
  description:
    "Returns the authenticated user's session data, or null if not authenticated.",
  responses: {
    200: {
      description: "User session or null",
      content: {
        "application/json": {
          schema: z.object({ user: z.any().nullable() }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/status",
  tags: ["Auth"],
  summary: "Authentication status",
  description: "Checks Google Drive authentication health status.",
  responses: {
    200: {
      description: "Auth health status",
      content: {
        "application/json": {
          schema: z.object({
            status: z.string(),
            error: z.string().optional(),
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
  path: "/api/auth/folder",
  tags: ["Auth"],
  summary: "Authenticate folder access",
  description:
    "Validates folder password protection credentials and returns a JWT token for folder access.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            folderId: z.string().min(1),
            id: z.string().min(1),
            password: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Authentication successful",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), token: z.string() }),
        },
      },
    },
    401: {
      description: "Invalid credentials",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Folder not configured for password protection",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    429: {
      description: "Rate limit exceeded",
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
  path: "/api/auth/local/check",
  tags: ["Auth"],
  summary: "Check local storage auth status",
  description:
    "Checks whether the user has an active local storage authentication session.",
  responses: {
    200: {
      description: "Auth status",
      content: {
        "application/json": {
          schema: z.object({ authenticated: z.boolean() }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/local/unlock",
  tags: ["Auth"],
  summary: "Unlock local storage",
  description:
    "Authenticates with a password to unlock local storage access. Returns a session cookie.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ password: z.string().min(1) }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Unlock successful",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    401: {
      description: "Invalid password",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    503: {
      description: "Server auth secret not configured",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/local/logout",
  tags: ["Auth"],
  summary: "Logout from local storage",
  description: "Clears the local storage authentication cookie.",
  responses: {
    200: {
      description: "Logged out",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/profile/password",
  tags: ["Auth"],
  summary: "Change password",
  description:
    "Changes the authenticated user's password. Requires current password verification.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            currentPassword: z.string().min(1),
            newPassword: z.string().min(6),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password updated",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    400: {
      description: "Current password is incorrect",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
