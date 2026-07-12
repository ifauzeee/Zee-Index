import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockCheckRateLimit,
  mockGetProtectedFolderCredentials,
  mockCompare,
  mockSign,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockGetProtectedFolderCredentials: vi.fn(),
  mockCompare: vi.fn(),
  mockSign: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (context: {
      request: NextRequest;
      body: unknown;
      query: unknown;
      params: Record<string, string>;
      session: null;
      requestId: string;
    }) => Promise<Response>,
    options?: {
      bodySchema?: {
        safeParse: (value: unknown) => {
          success: boolean;
          data?: unknown;
          error?: { issues: unknown[] };
        };
      };
      querySchema?: {
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

      let query: unknown;
      if (options?.querySchema) {
        const rawQuery = Object.fromEntries(request.nextUrl.searchParams);
        const parsedQuery = options.querySchema.safeParse(rawQuery);
        if (!parsedQuery.success) {
          return Response.json(
            {
              error: "Parameter query tidak valid.",
              details: parsedQuery.error?.issues ?? [],
            },
            { status: 400 },
          );
        }
        query = parsedQuery.data;
      }

      return handler({
        request,
        session: null,
        body,
        query,
        params: {},
        requestId: "test-request-id",
      });
    };
  },
}));

vi.mock("@/lib/auth", () => ({
  getProtectedFolderCredentials: mockGetProtectedFolderCredentials,
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mockCompare,
  },
}));

vi.mock("jose", () => ({
  SignJWT: class {
    setProtectedHeader() {
      return this;
    }

    setIssuedAt() {
      return this;
    }

    setExpirationTime() {
      return this;
    }

    async sign() {
      return mockSign();
    }
  },
}));

import { POST } from "@/app/api/auth/folder/route";

function createPostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/auth/folder", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("app/api/auth/folder POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHARE_SECRET_KEY =
      "test-share-secret-key-with-at-least-32-chars";
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockSign.mockResolvedValue("signed-folder-token");
  });

  it("returns 429 when the auth rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ success: false });

    const response = await POST(
      createPostRequest({
        folderId: "folder-1",
        id: "user-id",
        password: "secret",
      }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many requests. Please try again later.",
    });
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await POST(createPostRequest({ folderId: "folder-1" }));

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe("Invalid request body.");
  });

  it("returns 404 when the folder is not configured", async () => {
    mockGetProtectedFolderCredentials.mockResolvedValueOnce(null);

    const response = await POST(
      createPostRequest({
        folderId: "folder-1",
        id: "user-id",
        password: "secret",
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error:
        "This folder is not configured for password protection or was not found.",
    });
  });

  it("returns a signed token when the credentials are valid", async () => {
    mockGetProtectedFolderCredentials.mockResolvedValueOnce({
      id: "user-id",
      password: "hashed-password",
    });
    mockCompare.mockResolvedValueOnce(true);

    const response = await POST(
      createPostRequest({
        folderId: "folder-1",
        id: "user-id",
        password: "secret",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.token).toBe("signed-folder-token");
  });

  it("returns 401 when the folder id or password is invalid", async () => {
    mockGetProtectedFolderCredentials.mockResolvedValueOnce({
      id: "correct-id",
      password: "hashed-password",
    });
    mockCompare.mockResolvedValueOnce(true);

    const response = await POST(
      createPostRequest({
        folderId: "folder-1",
        id: "wrong-id",
        password: "secret",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid ID or password.",
    });
  });
});
