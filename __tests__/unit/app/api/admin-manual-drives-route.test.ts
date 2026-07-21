import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  mockKvGet,
  mockKvSet,
  mockKvDel,
  mockBcryptHash,
  mockDbProtectedFolderUpsert,
  mockDbProtectedFolderDelete,
} = vi.hoisted(() => ({
  mockKvGet: vi.fn(),
  mockKvSet: vi.fn(),
  mockKvDel: vi.fn(),
  mockBcryptHash: vi.fn(),
  mockDbProtectedFolderUpsert: vi.fn(),
  mockDbProtectedFolderDelete: vi.fn(),
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
    get: mockKvGet,
    set: mockKvSet,
    del: mockKvDel,
  },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mockBcryptHash },
  hash: mockBcryptHash,
}));

vi.mock("@/lib/db", () => ({
  db: {
    protectedFolder: {
      upsert: mockDbProtectedFolderUpsert,
      delete: mockDbProtectedFolderDelete,
    },
  },
}));

vi.mock("@/lib/manual-drives", () => ({
  MANUAL_DRIVES_KEY: "zee-index:manual-drives",
  manualDriveCreateSchema: {
    safeParse: (d: unknown) => ({ success: true, data: d }),
  },
  manualDriveDeleteSchema: {
    safeParse: (d: unknown) => ({ success: true, data: d }),
  },
  parseManualDriveRecords: (val: unknown) => {
    if (!Array.isArray(val)) return [];
    return val as Array<{ id: string; name: string; isProtected?: boolean }>;
  },
}));

import { GET, POST, DELETE } from "@/app/api/admin/manual-drives/route";

function makeRequest(method: string, body?: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/manual-drives", {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("app/api/admin/manual-drives GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvGet.mockResolvedValue([{ id: "drive1", name: "Drive 1" }]);
  });

  it("returns manual drives", async () => {
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([{ id: "drive1", name: "Drive 1" }]);
  });

  it("returns empty array when kv returns null", async () => {
    mockKvGet.mockResolvedValue(null);
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  it("returns 500 on error", async () => {
    mockKvGet.mockRejectedValue(new Error("kv error"));
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(500);
  });
});

describe("app/api/admin/manual-drives POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvGet.mockResolvedValue([{ id: "existing", name: "Existing" }]);
    mockBcryptHash.mockResolvedValue("$2a$10$hashed");
    mockDbProtectedFolderUpsert.mockResolvedValue({});
    mockKvSet.mockResolvedValue("OK");
    mockKvDel.mockResolvedValue(1);
  });

  it("creates a manual drive without password", async () => {
    const response = await POST(
      makeRequest("POST", { id: "newdrive", name: "New Drive" }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockKvSet).toHaveBeenCalled();
    expect(mockBcryptHash).not.toHaveBeenCalled();
  });

  it("creates a manual drive with password", async () => {
    const response = await POST(
      makeRequest("POST", {
        id: "protdrive",
        name: "Protected",
        password: "secret123",
      }),
    );
    expect(response.status).toBe(200);
    expect(mockBcryptHash).toHaveBeenCalledWith("secret123", 10);
    expect(mockDbProtectedFolderUpsert).toHaveBeenCalled();
  });

  it("returns 400 for duplicate id", async () => {
    const response = await POST(
      makeRequest("POST", { id: "existing", name: "Duplicate" }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mockKvGet.mockRejectedValue(new Error("kv error"));
    const response = await POST(
      makeRequest("POST", { id: "newdrive", name: "New Drive" }),
    );
    expect(response.status).toBe(500);
  });
});

describe("app/api/admin/manual-drives DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvGet.mockResolvedValue([
      { id: "drive1", name: "Drive 1" },
      { id: "drive2", name: "Drive 2" },
    ]);
    mockKvSet.mockResolvedValue("OK");
    mockDbProtectedFolderDelete.mockResolvedValue({});
    mockKvDel.mockResolvedValue(1);
  });

  it("removes a manual drive", async () => {
    const response = await DELETE(makeRequest("DELETE", { id: "drive1" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.drives).toEqual([{ id: "drive2", name: "Drive 2" }]);
  });

  it("returns 500 on error", async () => {
    mockKvGet.mockRejectedValue(new Error("kv error"));
    const response = await DELETE(makeRequest("DELETE", { id: "drive1" }));
    expect(response.status).toBe(500);
  });
});
