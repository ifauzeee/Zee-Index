import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockFindMany, mockUpsert, mockDelete, mockHash } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockUpsert: vi.fn(),
  mockDelete: vi.fn(),
  mockHash: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: {
      request: NextRequest;
      body?: unknown;
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
      let body: unknown;
      if (options?.bodySchema) {
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
        body = parsedBody.data;
      }

      return await handler({ request, body });
    };
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    protectedFolder: {
      findMany: mockFindMany,
      upsert: mockUpsert,
      delete: mockDelete,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mockHash,
  },
}));

import { GET, POST, DELETE } from "@/app/api/admin/protected-folders/route";

function createJsonRequest(
  method: "POST" | "DELETE",
  body: Record<string, unknown>,
) {
  return new NextRequest("http://localhost:3000/api/admin/protected-folders", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("app/api/admin/protected-folders route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHash.mockResolvedValue("hashed-secret");
  });

  it("returns sanitized protected folders map", async () => {
    mockFindMany.mockResolvedValue([
      { folderId: "folder-a" },
      { folderId: "folder-b" },
    ]);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/protected-folders"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      "folder-a": { id: "admin", password: "***REDACTED***" },
      "folder-b": { id: "admin", password: "***REDACTED***" },
    });
  });

  it("stores hashed password on POST", async () => {
    const response = await POST(
      createJsonRequest("POST", {
        folderId: " folder-123 ",
        password: "secret",
      }),
    );

    expect(mockHash).toHaveBeenCalledWith("secret", 10);
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { folderId: "folder-123" },
      update: { password: "hashed-secret" },
      create: { folderId: "folder-123", password: "hashed-secret" },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Folder folder-123 berhasil dilindungi.",
    });
  });

  it("returns 400 when POST payload is invalid", async () => {
    const response = await POST(
      createJsonRequest("POST", {
        folderId: "abc",
        password: "",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid request body.",
    });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("deletes folder protection on DELETE", async () => {
    mockDelete.mockResolvedValue({ folderId: "folder-a" });

    const response = await DELETE(
      createJsonRequest("DELETE", { folderId: "folder-a" }),
    );

    expect(mockDelete).toHaveBeenCalledWith({
      where: { folderId: "folder-a" },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Perlindungan untuk folder folder-a telah dihapus.",
    });
  });

  it("returns success when folder does not exist on DELETE", async () => {
    mockDelete.mockRejectedValue(new Error("not found"));

    const response = await DELETE(
      createJsonRequest("DELETE", { folderId: "folder-missing" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Perlindungan untuk folder folder-missing telah dihapus.",
    });
  });
});
