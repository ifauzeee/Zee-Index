import { z } from "zod";
import {
  registry,
  BulkDeleteBodySchema,
  BulkMoveBodySchema,
  CopyBodySchema,
  CreateFolderBodySchema,
  DeleteBodySchema,
  ErrorResponseSchema,
  FilesQuerySchema,
  FileUpdateBodySchema,
  FileUploadQuerySchema,
  MoveBodySchema,
  PaginatedFilesSchema,
  RenameBodySchema,
} from "./schemas";

/* ------------------------------------------------------------------ */
/*  Paths — Files                                                     */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "get",
  path: "/api/files",
  tags: ["Files"],
  summary: "List files in a folder",
  description:
    "Returns a paginated list of files and folders. Optionally accepts a shareToken for shared access.",
  request: {
    query: FilesQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated file list",
      content: { "application/json": { schema: PaginatedFilesSchema } },
    },
    400: {
      description: "Invalid query parameters",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/files/delete",
  tags: ["Files"],
  summary: "Delete a file",
  description:
    "Permanently deletes a file from Google Drive or local storage. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: DeleteBodySchema } },
    },
  },
  responses: {
    200: {
      description: "File deleted successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid request body",
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
  path: "/api/files/rename",
  tags: ["Files"],
  summary: "Rename a file",
  description: "Renames a file or folder in the storage backend. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: RenameBodySchema } },
    },
  },
  responses: {
    200: {
      description: "File renamed successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid request body",
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
  path: "/api/files/move",
  tags: ["Files"],
  summary: "Move a file",
  description: "Moves a file to a different folder. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: MoveBodySchema } },
    },
  },
  responses: {
    200: {
      description: "File moved successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid request body",
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
  path: "/api/files/copy",
  tags: ["Files"],
  summary: "Copy a file",
  description: "Creates a copy of a file in the target folder. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: CopyBodySchema } },
    },
  },
  responses: {
    200: {
      description: "File copied successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid request body",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/*  Paths — Files — Upload                                             */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/files/upload",
  tags: ["Files"],
  summary: "Upload a file",
  description:
    "Uploads files via resumable upload (init + chunk phases). Editor or Admin only.",
  request: {
    query: FileUploadQuerySchema,
  },
  responses: {
    200: {
      description: "Upload URL (init) or completion status (chunk)",
      content: {
        "application/json": {
          schema: z
            .object({
              uploadUrl: z.string().optional(),
              status: z.string().optional(),
              file: z.any().optional(),
            })
            .or(z.object({ status: z.literal("partial") })),
        },
      },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Files — Update                                             */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/files/update",
  tags: ["Files"],
  summary: "Update file content",
  description:
    "Overwrites the content of an existing file in Google Drive. Editor or Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: FileUpdateBodySchema } },
    },
  },
  responses: {
    200: {
      description: "File updated successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), file: z.any() }),
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
  method: "patch",
  path: "/api/files/update-media",
  tags: ["Files"],
  summary: "Update file media content",
  description:
    "Updates a file's binary content via multipart/form-data. Admin only.",
  request: {},
  responses: {
    200: {
      description: "Media updated successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    400: {
      description: "Missing file or fileId",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
/*  Paths — Files — Bulk Operations                                    */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/files/bulk-delete",
  tags: ["Files"],
  summary: "Bulk delete files",
  description:
    "Permanently deletes multiple files from Google Drive. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: BulkDeleteBodySchema } },
    },
  },
  responses: {
    200: {
      description: "All files deleted",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    207: {
      description: "Partial success — some files failed to delete",
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
  method: "post",
  path: "/api/files/bulk-move",
  tags: ["Files"],
  summary: "Bulk move files",
  description:
    "Moves multiple files to a different folder. Editor or Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: BulkMoveBodySchema } },
    },
  },
  responses: {
    200: {
      description: "All files moved successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    207: {
      description: "Partial success — some files failed to move",
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
/*  Paths — Files — Folder Create / Revisions                          */
/* ------------------------------------------------------------------ */

registry.registerPath({
  method: "post",
  path: "/api/folder/create",
  tags: ["Files"],
  summary: "Create a folder",
  description: "Creates a new folder in Google Drive. Admin only.",
  request: {
    body: {
      content: { "application/json": { schema: CreateFolderBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Folder created successfully",
      content: {
        "application/json": { schema: z.any() },
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
  path: "/api/files/{fileId}/revisions",
  tags: ["Files"],
  summary: "List file revisions",
  description: "Returns revision history for a file. Admin only.",
  request: {
    params: z.object({ fileId: z.string() }),
  },
  responses: {
    200: {
      description: "List of revisions",
      content: {
        "application/json": { schema: z.any() },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/* ------------------------------------------------------------------ */
