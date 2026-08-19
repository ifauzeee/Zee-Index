import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockFindMany,
  mockCreate,
  mockFindUnique,
  mockUpdate,
  mockGenerateApiKey,
  mockClearApiKeyCache,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockGenerateApiKey: vi.fn(),
  mockClearApiKeyCache: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: {
      request: NextRequest;
      body?: unknown;
      params?: Record<string, string>;
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
    return async (
      request: NextRequest,
      context?: { params?: Record<string, string> },
    ) => {
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

      return await handler({ request, body, params: context?.params });
    };
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    apiKey: {
      findMany: mockFindMany,
      create: mockCreate,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

vi.mock("@/lib/api-key", () => ({
  generateApiKey: mockGenerateApiKey,
  clearApiKeyCache: mockClearApiKeyCache,
}));

import { GET, POST } from "@/app/api/admin/api-keys/route";
import { DELETE } from "@/app/api/admin/api-keys/[id]/route";

function createJsonRequest(
  method: "POST" | "DELETE",
  body: Record<string, unknown>,
) {
  return new NextRequest("http://localhost:3000/api/admin/api-keys", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("app/api/admin/api-keys route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockCreate.mockResolvedValue({});
    mockFindUnique.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({});
    mockClearApiKeyCache.mockResolvedValue(undefined);
    mockGenerateApiKey.mockReturnValue({
      raw: "raw-secret-key-value",
      prefix: "zk_abc12",
      hash: "$2a$10$hashedvalue",
    });
  });

  it("lists keys without exposing hashes", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "key-1",
        name: "CI/CD",
        keyPrefix: "zk_abc12",
        permissions: ["files:read"],
        lastUsedAt: null,
        expiresAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        createdBy: "admin@example.com",
        revoked: false,
      },
    ]);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/api-keys"),
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.keys).toHaveLength(1);
    expect(payload.keys[0]).not.toHaveProperty("keyHash");
  });

  it("creates a key and returns the raw key exactly once", async () => {
    const response = await POST(
      createJsonRequest("POST", {
        name: "  Backup Script  ",
        permissions: ["files:read", "download"],
      }),
    );

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Backup Script", // trimmed
        keyPrefix: "zk_abc12",
        keyHash: "$2a$10$hashedvalue", // bcrypt hash, not raw
        permissions: ["files:read", "download"],
        createdBy: "unknown", // no session in this context
      }),
    });

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.apiKey).toBe("raw-secret-key-value");
    expect(payload.prefix).toBe("zk_abc12");
  });

  it("rejects a body without a name", async () => {
    const response = await POST(
      createJsonRequest("POST", { permissions: ["files:read"] }),
    );

    expect(response.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects a body without permissions", async () => {
    const response = await POST(
      createJsonRequest("POST", { name: "Key", permissions: [] }),
    );

    expect(response.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when revoking a non-existent key", async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await DELETE(createJsonRequest("DELETE", {}), {
      params: { id: "missing-id" },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "API key not found.",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("revokes a key and clears its cache", async () => {
    mockFindUnique.mockResolvedValue({
      id: "key-1",
      keyPrefix: "zk_abc12",
      keyHash: "$2a$10$hashedvalue",
      revoked: false,
    });

    const response = await DELETE(createJsonRequest("DELETE", {}), {
      params: { id: "key-1" },
    });

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "key-1" } });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "key-1" },
      data: { revoked: true },
    });
    expect(mockClearApiKeyCache).toHaveBeenCalledWith("zk_abc12");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});
