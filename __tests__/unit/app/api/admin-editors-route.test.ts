import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  mockKvSmembers,
  mockKvSadd,
  mockKvSrem,
  mockKvSismember,
  mockDbUserFindMany,
  mockDbUserUpsert,
} = vi.hoisted(() => ({
  mockKvSmembers: vi.fn(),
  mockKvSadd: vi.fn(),
  mockKvSrem: vi.fn(),
  mockKvSismember: vi.fn(),
  mockDbUserFindMany: vi.fn(),
  mockDbUserUpsert: vi.fn(),
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
      if (request.method === "GET") {
        return handler({ request });
      }
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
    sismember: mockKvSismember,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: mockDbUserFindMany,
      upsert: mockDbUserUpsert,
    },
  },
}));

import { GET, POST, DELETE } from "@/app/api/admin/editors/route";

describe("app/api/admin/editors GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvSmembers.mockResolvedValue(["editor1@example.com"]);
    mockDbUserFindMany.mockResolvedValue([
      { email: "editor2@example.com" },
      { email: "editor1@example.com" },
    ]);
  });

  it("returns merged editor emails from kv and db", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/editors"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(
      expect.arrayContaining(["editor1@example.com", "editor2@example.com"]),
    );
    expect(body).toHaveLength(2);
  });

  it("returns 500 on error", async () => {
    mockKvSmembers.mockRejectedValue(new Error("kv error"));
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/editors"),
    );
    expect(response.status).toBe(500);
  });
});

describe("app/api/admin/editors POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvSismember.mockResolvedValue(0);
    mockKvSadd.mockResolvedValue(1);
    mockDbUserUpsert.mockResolvedValue({
      email: "new@example.com",
      role: "EDITOR",
    });
  });

  it("adds an editor", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/editors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "new@example.com" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: "Editor added",
      email: "new@example.com",
    });
  });

  it("rejects invalid email", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/editors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mockKvSadd.mockRejectedValue(new Error("kv error"));
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/editors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "new@example.com" }),
      }),
    );
    expect(response.status).toBe(500);
  });
});

describe("app/api/admin/editors DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvSismember.mockResolvedValue(0);
    mockKvSrem.mockResolvedValue(1);
    mockDbUserUpsert.mockResolvedValue({
      email: "remove@example.com",
      role: "USER",
    });
  });

  it("removes an editor", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/admin/editors", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "remove@example.com" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: "Editor removed",
      email: "remove@example.com",
    });
  });

  it("rejects invalid email", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/admin/editors", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "not-email" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mockKvSrem.mockRejectedValue(new Error("kv error"));
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/admin/editors", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "remove@example.com" }),
      }),
    );
    expect(response.status).toBe(500);
  });
});
