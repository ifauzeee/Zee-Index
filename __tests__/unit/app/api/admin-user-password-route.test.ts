import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockSetPasswordHash, mockGetPasswordHash, mockBcryptHash } = vi.hoisted(
  () => ({
    mockSetPasswordHash: vi.fn(),
    mockGetPasswordHash: vi.fn(),
    mockBcryptHash: vi.fn(),
  }),
);

type RouteHandler = (ctx: {
  body?: unknown;
  query?: Record<string, string>;
  request: NextRequest;
}) => Promise<Response>;

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: RouteHandler,
    opts?: { bodySchema?: unknown; querySchema?: unknown },
  ) => {
    return async (request: NextRequest) => {
      if (request.method === "GET" || request.method === "DELETE") {
        const params = Object.fromEntries(request.nextUrl.searchParams);
        if (opts?.querySchema) {
          const parsed = (
            opts.querySchema as {
              safeParse: (d: unknown) => { success: boolean };
            }
          ).safeParse(params);
          if (!parsed.success)
            return NextResponse.json({ error: "invalid" }, { status: 400 });
        }
        return handler({ query: params, request });
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

vi.mock("@/lib/credentials", () => ({
  setPasswordHash: mockSetPasswordHash,
  getPasswordHash: mockGetPasswordHash,
}));
vi.mock("@/lib/db", () => ({ db: { user: { upsert: vi.fn() } } }));

vi.mock("bcryptjs", () => ({
  default: { hash: mockBcryptHash },
  hash: mockBcryptHash,
}));

import { GET, POST, DELETE } from "@/app/api/admin/user-password/route";

describe("app/api/admin/user-password POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBcryptHash.mockResolvedValue("$2a$10$hashedpassword");
    mockSetPasswordHash.mockResolvedValue(undefined);
  });

  it("hashes the password and stores it in the credential store", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/user-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
        }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ success: true });
    expect(mockBcryptHash).toHaveBeenCalledWith("password123", 10);
    expect(mockSetPasswordHash).toHaveBeenCalledWith(
      "user@example.com",
      "$2a$10$hashedpassword",
    );
  });

  it("rejects short password", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/user-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "123" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects invalid email", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/user-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "not-an-email",
          password: "password123",
        }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mockBcryptHash.mockRejectedValue(new Error("bcrypt error"));
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/user-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
        }),
      }),
    );
    expect(response.status).toBe(500);
  });
});

describe("app/api/admin/user-password DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetPasswordHash.mockResolvedValue(undefined);
  });

  it("clears the stored password", async () => {
    const response = await DELETE(
      new NextRequest(
        "http://localhost:3000/api/admin/user-password?email=user@example.com",
        { method: "DELETE" },
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ success: true });
    expect(mockSetPasswordHash).toHaveBeenCalledWith("user@example.com", null);
  });

  it("rejects missing email", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/admin/user-password", {
        method: "DELETE",
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe("app/api/admin/user-password GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPasswordHash.mockResolvedValue("$2a$10$hash");
  });

  it("returns hasPassword true when a hash is stored", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/user-password?email=user@example.com",
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ email: "user@example.com", hasPassword: true });
  });

  it("returns hasPassword false when no hash is stored", async () => {
    mockGetPasswordHash.mockResolvedValue(null);
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/user-password?email=other@example.com",
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ email: "other@example.com", hasPassword: false });
  });

  it("rejects missing email", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/user-password"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mockGetPasswordHash.mockRejectedValue(new Error("db error"));
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/user-password?email=user@example.com",
      ),
    );
    expect(response.status).toBe(500);
  });
});
