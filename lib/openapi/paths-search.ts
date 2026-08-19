import { z } from "zod";
import { registry, ErrorResponseSchema } from "./schemas";

/*  Paths — Search                                                     */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/search",
  tags: ["Search"],
  summary: "Search files",
  description:
    "Searches files in Google Drive by name, mimeType, date range, or size.",
  request: {
    query: z.object({
      q: z.string().optional(),
      folderId: z.string().optional(),
      searchType: z.string().optional(),
      mimeType: z.string().optional(),
      modifiedTime: z.string().optional(),
      minSize: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Search results",
      content: {
        "application/json": {
          schema: z.object({
            files: z.array(z.any()),
            nextPageToken: z.string().nullable(),
          }),
        },
      },
    },
    400: {
      description: "Search criteria required",
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
  path: "/api/search/global",
  tags: ["Search"],
  summary: "Global search across all drives",
  description:
    "Searches across all descendant folders and merged index results.",
  request: {
    query: z.object({
      q: z.string().optional(),
      searchType: z.string().optional(),
      mimeType: z.string().optional(),
      modifiedTime: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Global search results",
      content: {
        "application/json": {
          schema: z.object({ files: z.array(z.any()) }),
        },
      },
    },
    400: {
      description: "Search term required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
