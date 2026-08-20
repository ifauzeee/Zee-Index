import { z } from "zod";
import {
  registry,
  ArchivePreviewResponseSchema,
  ErrorResponseSchema,
  FolderPathResponseSchema,
  ZeeFileSchema,
} from "./schemas";

/*  Paths — Download                                                   */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/download",
  tags: ["Download"],
  summary: "Download or stream a file",
  description:
    "Downloads or streams a file from storage. Supports range requests for video streaming and optional PDF export.",
  request: {
    query: z.object({
      fileId: z.string().optional(),
      export: z.string().optional(),
      preview: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "File binary stream",
      content: { "application/octet-stream": { schema: z.string() } },
    },
    400: {
      description: "Bad request (folder download not supported)",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "File not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "head",
  path: "/api/download",
  tags: ["Download"],
  summary: "Download request headers",
  description:
    "Returns response headers for a download without the file body. Used for range checks.",
  request: {
    query: z.object({
      fileId: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Headers only, no body",
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — File Details & Preview                                     */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/filedetails",
  tags: ["Files"],
  summary: "Get file details",
  description: "Returns detailed metadata for a specific file by ID.",
  request: {
    query: z.object({
      fileId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "File details",
      content: { "application/json": { schema: ZeeFileSchema } },
    },
    400: {
      description: "Missing fileId parameter",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Access denied",
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
  path: "/api/folderpath",
  tags: ["Files"],
  summary: "Get folder breadcrumb path",
  description:
    "Returns the hierarchical breadcrumb path from root to the specified folder.",
  request: {
    query: z.object({
      folderId: z.string(),
      locale: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Folder path breadcrumbs",
      content: {
        "application/json": { schema: FolderPathResponseSchema },
      },
    },
    400: {
      description: "Missing folderId parameter",
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
  path: "/api/metadata",
  tags: ["Files"],
  summary: "Get media metadata",
  description: "Looks up TMDB metadata for a media file by filename.",
  request: {
    query: z.object({
      filename: z.string(),
    }),
  },
  responses: {
    200: {
      description: "TMDB metadata",
      content: { "application/json": { schema: z.any() } },
    },
    400: {
      description: "Filename is required",
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
  path: "/api/proxy-image",
  tags: ["Files"],
  summary: "Proxy and process images",
  description:
    "Fetches, resizes, and converts images to WebP format with configurable quality. Only allowed from Google hosts.",
  request: {
    query: z.object({
      url: z.string(),
      w: z.coerce.number().optional(),
      h: z.coerce.number().optional(),
      q: z.coerce.number().optional(),
    }),
  },
  responses: {
    200: {
      description: "Processed WebP image",
      content: { "image/webp": { schema: z.string() } },
    },
    400: {
      description: "Missing url parameter",
    },
    500: {
      description: "Internal server error",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/archive-preview",
  tags: ["Files"],
  summary: "Preview archive contents",
  description:
    "Lists the contents of a ZIP archive file without downloading it.",
  request: {
    query: z.object({
      fileId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Archive file listing",
      content: {
        "application/json": { schema: ArchivePreviewResponseSchema },
      },
    },
    400: {
      description: "Missing fileId parameter",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Access denied",
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
  path: "/api/events",
  tags: ["Files"],
  summary: "Server-sent events",
  description:
    "Opens an SSE (Server-Sent Events) stream for real-time activity notifications.",
  responses: {
    200: {
      description: "SSE event stream (text/event-stream)",
      content: { "text/event-stream": { schema: z.string() } },
    },
  },
});

/* ------------------------------------------------------------------ */
