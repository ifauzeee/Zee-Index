import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockSmembers, mockSadd, mockSrem } = vi.hoisted(() => ({
  mockSmembers: vi.fn(),
  mockSadd: vi.fn(),
  mockSrem: vi.fn(),
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

vi.mock("@/lib/kv", () => ({
  kv: {
    smembers: mockSmembers,
    sadd: mockSadd,
    srem: mockSrem,
  },
}));

import { GET, POST, DELETE } from "@/app/api/admin/users/route";
import { REDIS_KEYS } from "@/lib/constants";

function createJsonRequest(
  method: "POST" | "DELETE",
  body: Record<string, unknown>,
) {
  return new NextRequest("http://localhost:3000/api/admin/users", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("app/api/admin/users route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns admin users list", async () => {
    mockSmembers.mockResolvedValue([
      "admin1@example.com",
      "admin2@example.com",
    ]);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/users"),
    );

    expect(mockSmembers).toHaveBeenCalledWith(REDIS_KEYS.ADMIN_USERS);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      "admin1@example.com",
      "admin2@example.com",
    ]);
  });

  it("returns 500 when fetching admins fails", async () => {
    mockSmembers.mockRejectedValue(new Error("redis unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/users"),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to fetch admins",
    });
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("adds admin user on POST", async () => {
    mockSadd.mockResolvedValue(1);

    const response = await POST(
      createJsonRequest("POST", { email: "newadmin@example.com" }),
    );

    expect(mockSadd).toHaveBeenCalledWith(
      REDIS_KEYS.ADMIN_USERS,
      "newadmin@example.com",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Admin added",
      email: "newadmin@example.com",
    });
  });

  it("returns 400 for invalid email payload", async () => {
    const response = await POST(
      createJsonRequest("POST", { email: "not-an-email" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid request body.",
    });
    expect(mockSadd).not.toHaveBeenCalled();
  });

  it("removes admin user on DELETE", async () => {
    mockSrem.mockResolvedValue(1);

    const response = await DELETE(
      createJsonRequest("DELETE", { email: "remove@example.com" }),
    );

    expect(mockSrem).toHaveBeenCalledWith(
      REDIS_KEYS.ADMIN_USERS,
      "remove@example.com",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Admin removed",
      email: "remove@example.com",
    });
  });
});
