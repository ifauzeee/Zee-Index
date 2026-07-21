import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  mockDbFolderAccessFindMany,
  mockDbFolderAccessUpsert,
  mockDbFolderAccessDelete,
  mockKvSmembers,
  mockKvSadd,
  mockKvSrem,
  mockKvScard,
} = vi.hoisted(() => ({
  mockDbFolderAccessFindMany: vi.fn(),
  mockDbFolderAccessUpsert: vi.fn(),
  mockDbFolderAccessDelete: vi.fn(),
  mockKvSmembers: vi.fn(),
  mockKvSadd: vi.fn(),
  mockKvSrem: vi.fn(),
  mockKvScard: vi.fn(),
}));

type RouteHandler = (ctx: {
  body?: unknown;
  request: NextRequest;
}) => Promise<Response>;

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: RouteHandler,
    opts?: { bodySchema?: unknown },
  ) => {
    return async (request: NextRequest) => {
      if (request.method === "GET") return handler({ request });
      const raw = await request.json().catch(() => undefined);
      if (opts?.bodySchema && raw) {
        const parsed = (
          opts.bodySchema as {
            safeParse: (d: unknown) => { success: boolean; data?: unknown };
          }
        ).safeParse(raw);
        if (!parsed.success)
          return NextResponse.json({ error: "invalid" }, { status: 400 });
        return handler({ body: parsed.data, request });
      }
      return handler({ body: raw, request });
    };
  },
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    smembers: mockKvSmembers,
    sadd: mockKvSadd,
    srem: mockKvSrem,
    scard: mockKvScard,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    folderAccess: {
      findMany: mockDbFolderAccessFindMany,
      upsert: mockDbFolderAccessUpsert,
      delete: mockDbFolderAccessDelete,
    },
  },
}));

import { GET, POST, DELETE } from "@/app/api/admin/user-access/route";

function makeRequest(method: string, body?: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/user-access", {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("app/api/admin/user-access GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbFolderAccessFindMany.mockResolvedValue([
      { folderId: "f1", email: "user@example.com" },
    ]);
  });

  it("returns permissions from db", async () => {
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ f1: ["user@example.com"] });
  });

  it("falls back to kv when db is empty", async () => {
    mockDbFolderAccessFindMany.mockResolvedValue([]);
    mockKvSmembers
      .mockResolvedValueOnce(["f1"])
      .mockResolvedValueOnce(["user@example.com"]);
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ f1: ["user@example.com"] });
  });

  it("returns empty object when both db and kv are empty", async () => {
    mockDbFolderAccessFindMany.mockResolvedValue([]);
    mockKvSmembers.mockResolvedValue([]);
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({});
  });

  it("returns 500 on error", async () => {
    mockDbFolderAccessFindMany.mockRejectedValue(new Error("db error"));
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(500);
  });
});

describe("app/api/admin/user-access POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbFolderAccessUpsert.mockResolvedValue({});
    mockKvSadd.mockResolvedValue(1);
  });

  it("grants folder access", async () => {
    const response = await POST(
      makeRequest("POST", { folderId: "folder1", email: "user@example.com" }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockDbFolderAccessUpsert).toHaveBeenCalled();
    expect(mockKvSadd).toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    mockDbFolderAccessUpsert.mockRejectedValue(new Error("db error"));
    const response = await POST(
      makeRequest("POST", { folderId: "folder1", email: "user@example.com" }),
    );
    expect(response.status).toBe(500);
  });
});

describe("app/api/admin/user-access DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbFolderAccessDelete.mockResolvedValue({});
    mockKvSrem.mockResolvedValue(1);
    mockKvScard.mockResolvedValue(0);
  });

  it("revokes folder access", async () => {
    const response = await DELETE(
      makeRequest("DELETE", { folderId: "folder1", email: "user@example.com" }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockDbFolderAccessDelete).toHaveBeenCalled();
    expect(mockKvSrem).toHaveBeenCalled();
  });

  it("removes folder from parent set when no remaining emails", async () => {
    mockKvScard.mockResolvedValue(0);
    const response = await DELETE(
      makeRequest("DELETE", { folderId: "folder1", email: "user@example.com" }),
    );
    expect(response.status).toBe(200);
    expect(mockKvSrem).toHaveBeenCalledTimes(2);
  });

  it("returns 500 on error", async () => {
    mockKvSrem.mockRejectedValue(new Error("kv error"));
    const response = await DELETE(
      makeRequest("DELETE", { folderId: "folder1", email: "user@example.com" }),
    );
    expect(response.status).toBe(500);
  });
});
