import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockKvSet,
  mockShareLinkCreate,
  mockSendMail,
  mockDecodeJwt,
  mockSign,
} = vi.hoisted(() => ({
  mockKvSet: vi.fn(),
  mockShareLinkCreate: vi.fn(),
  mockSendMail: vi.fn(),
  mockDecodeJwt: vi.fn(),
  mockSign: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: {
      request: NextRequest;
      session: { user: { email: string; role: string } };
      body: unknown;
      query: unknown;
      params: Record<string, string>;
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
        session: { user: { email: "admin@example.com", role: "ADMIN" } },
        body,
        query,
        params: {},
        requestId: "test-request-id",
      });
    };
  },
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    set: mockKvSet,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    shareLink: {
      create: mockShareLinkCreate,
    },
  },
}));

vi.mock("@/lib/mailer", () => ({
  sendMail: mockSendMail,
}));

vi.mock("@/lib/utils", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return {
    ...actual,
    getBaseUrl: () => "http://localhost:3000",
  };
});

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

    setJti() {
      return this;
    }

    async sign() {
      return mockSign();
    }
  },
  decodeJwt: mockDecodeJwt,
}));

import { POST } from "@/app/api/share/route";

function createPostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("app/api/share POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHARE_SECRET_KEY =
      "test-share-secret-key-with-at-least-32-chars";
    process.env.ADMIN_EMAILS = "admin@example.com";
    mockSign.mockResolvedValue("signed-share-token");
    mockDecodeJwt.mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    mockKvSet.mockResolvedValue("OK");
    mockShareLinkCreate.mockResolvedValue({
      id: "share-id",
      path: "/folder/demo",
      token: "signed-share-token",
      jti: "share-id",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      loginRequired: false,
      itemName: "Demo File",
      isCollection: false,
      maxUses: null,
      preventDownload: false,
      hasWatermark: false,
      watermarkText: null,
    });
  });

  it("returns 400 for incomplete payloads", async () => {
    const response = await POST(
      createPostRequest({
        itemName: "Demo File",
        type: "timed",
      }),
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe("Invalid request body.");
  });

  it("returns 400 for invalid expiration formats", async () => {
    const response = await POST(
      createPostRequest({
        path: "/folder/demo",
        itemName: "Demo File",
        type: "timed",
        expiresIn: "tomorrow",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "Format expiresIn tidak valid. Gunakan format seperti: 1h, 7d, 30d",
    });
  });

  it("creates a share link and returns the share payload", async () => {
    const response = await POST(
      createPostRequest({
        path: "/folder/demo",
        itemName: "Demo File",
        type: "timed",
        expiresIn: "1h",
        loginRequired: false,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.shareableUrl).toBe(
      "http://localhost:3000/folder/demo?share_token=signed-share-token",
    );
    expect(payload.token).toBe("signed-share-token");
    expect(payload.newShareLink.itemName).toBe("Demo File");
    expect(mockShareLinkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdBy: "admin@example.com",
          itemName: "Demo File",
        }),
      }),
    );
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("stores collection items in kv for collection shares", async () => {
    const items = [
      {
        id: "file-1",
        name: "File 1",
        mimeType: "text/plain",
        modifiedTime: "",
        createdTime: "",
        hasThumbnail: false,
        webViewLink: "",
        isFolder: false,
        trashed: false,
      },
    ];

    const response = await POST(
      createPostRequest({
        itemName: "Shared Collection",
        type: "session",
        expiresIn: "1h",
        items,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockKvSet).toHaveBeenCalled();
  });
});
