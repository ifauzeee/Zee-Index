import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockListTrashedFiles, mockRestoreTrash, mockDeleteForever } =
  vi.hoisted(() => ({
    mockListTrashedFiles: vi.fn(),
    mockRestoreTrash: vi.fn(),
    mockDeleteForever: vi.fn(),
  }));

vi.mock("@/lib/drive", () => ({
  listTrashedFiles: mockListTrashedFiles,
  restoreTrash: mockRestoreTrash,
  deleteForever: mockDeleteForever,
}));

// Import the actual schema for validation
import { z } from "zod";

const trashActionSchema = z
  .object({
    fileId: z.string().min(1).optional(),
    fileIds: z.array(z.string().min(1)).min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.fileId && !value.fileIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File ID or IDs are required",
      });
    }
  });

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: {
      request: NextRequest;
      body?: { fileId?: string; fileIds?: string[] };
    }) => Promise<Response>,
    options?: {
      bodySchema?: {
        safeParse: (value: unknown) => {
          success: boolean;
          data?: unknown;
          error?: { issues: unknown[] };
        };
      };
    },
  ) => {
    return async (request: NextRequest) => {
      let body: { fileId?: string; fileIds?: string[] } | undefined;
      if (options?.bodySchema) {
        try {
          const rawBody = await request.json();
          const parsedBody = options.bodySchema.safeParse(rawBody);
          if (!parsedBody.success) {
            return Response.json(
              {
                error: "Invalid request body.",
                details: parsedBody.error?.issues ?? [],
              },
              { status: 400 },
            );
          }
          body = parsedBody.data as { fileId?: string; fileIds?: string[] };
        } catch {
          return Response.json(
            { error: "Invalid request body.", details: [] },
            { status: 400 },
          );
        }
      }
      return await handler({ request, body });
    };
  },
}));

import { GET, POST, DELETE } from "@/app/api/trash/route";

function createRequest(
  method: "GET" | "POST" | "DELETE",
  body?: Record<string, unknown>,
) {
  return new NextRequest("http://localhost:3000/api/trash", {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("app/api/trash route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns trashed files for admin", async () => {
      const mockFiles = [
        { id: "file1", name: "old-doc.pdf", trashed: true },
        { id: "file2", name: "old-image.png", trashed: true },
      ];
      mockListTrashedFiles.mockResolvedValue(mockFiles);

      const response = await GET(createRequest("GET"));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(mockFiles);
      expect(mockListTrashedFiles).toHaveBeenCalledOnce();
    });

    it("returns 500 when listTrashedFiles throws", async () => {
      mockListTrashedFiles.mockRejectedValue(new Error("drive error"));

      const response = await GET(createRequest("GET"));
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Failed to fetch trash",
      });
    });
  });

  describe("POST", () => {
    it("restores a single file", async () => {
      mockRestoreTrash.mockResolvedValue(undefined);

      const response = await POST(createRequest("POST", { fileId: "file1" }));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true });
      expect(mockRestoreTrash).toHaveBeenCalledWith("file1");
    });

    it("restores multiple files", async () => {
      mockRestoreTrash.mockResolvedValue(undefined);

      const response = await POST(
        createRequest("POST", { fileIds: ["file1", "file2"] }),
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true });
      expect(mockRestoreTrash).toHaveBeenCalledWith(["file1", "file2"]);
    });

    it("returns 400 when body is invalid", async () => {
      const response = await POST(createRequest("POST", {}));
      expect(response.status).toBe(400);
    });

    it("returns 500 when restore throws", async () => {
      mockRestoreTrash.mockRejectedValue(new Error("restore failed"));

      const response = await POST(createRequest("POST", { fileId: "file1" }));
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Failed to restore",
      });
    });
  });

  describe("DELETE", () => {
    it("deletes a single file permanently", async () => {
      mockDeleteForever.mockResolvedValue(undefined);

      const response = await DELETE(
        createRequest("DELETE", { fileId: "file1" }),
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true });
      expect(mockDeleteForever).toHaveBeenCalledWith("file1");
    });

    it("deletes multiple files permanently", async () => {
      mockDeleteForever.mockResolvedValue(undefined);

      const response = await DELETE(
        createRequest("DELETE", { fileIds: ["file1", "file2"] }),
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true });
      expect(mockDeleteForever).toHaveBeenCalledWith(["file1", "file2"]);
    });

    it("returns 400 when body is invalid", async () => {
      const response = await DELETE(createRequest("DELETE", {}));
      expect(response.status).toBe(400);
    });

    it("returns 500 when deleteForever throws", async () => {
      mockDeleteForever.mockRejectedValue(new Error("delete failed"));

      const response = await DELETE(
        createRequest("DELETE", { fileId: "file1" }),
      );
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Failed to delete",
      });
    });
  });
});
