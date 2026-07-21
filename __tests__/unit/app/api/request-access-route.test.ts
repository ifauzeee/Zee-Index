import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockKvSAdd, mockKvSMembers, mockSendMail, mockLogActivity } =
  vi.hoisted(() => ({
    mockKvSAdd: vi.fn(),
    mockKvSMembers: vi.fn(),
    mockSendMail: vi.fn(),
    mockLogActivity: vi.fn(),
  }));

vi.mock("@/lib/kv", () => ({
  kv: {
    sadd: mockKvSAdd,
    smembers: mockKvSMembers,
  },
}));

vi.mock("@/lib/mailer", () => ({
  sendMail: mockSendMail,
}));

vi.mock("@/lib/activityLogger", () => ({
  logActivity: mockLogActivity,
}));

import { z } from "zod";

const accessRequestCreateSchema = z.object({
  folderId: z.string().min(1),
  folderName: z.string().min(1),
});

vi.mock("@/lib/api-middleware", () => ({
  createUserRoute: (
    handler: (context: {
      request: NextRequest;
      body?: { folderId: string; folderName: string };
      session?: {
        user?: { email?: string; name?: string; isGuest?: boolean };
      };
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
      let body: { folderId: string; folderName: string } | undefined;
      if (options?.bodySchema) {
        try {
          const rawBody = await request.json();
          const parsedBody = options.bodySchema.safeParse(rawBody);
          if (!parsedBody.success) {
            return NextResponse.json(
              {
                error: "Invalid request body.",
                details: parsedBody.error?.issues ?? [],
              },
              { status: 400 },
            );
          }
          body = parsedBody.data as { folderId: string; folderName: string };
        } catch {
          return NextResponse.json(
            { error: "Invalid request body.", details: [] },
            { status: 400 },
          );
        }
      }
      return await handler({
        request,
        body,
        session: {
          user: {
            email: "user@test.com",
            name: "Test User",
            isGuest: false,
          },
        },
      });
    };
  },
}));

import { POST } from "@/app/api/request-access/route";

function createRequest(body?: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/request-access", {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("app/api/request-access route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvSAdd.mockResolvedValue(1);
    mockKvSMembers.mockResolvedValue(["admin@example.com"]);
    mockSendMail.mockResolvedValue(undefined);
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("returns 400 when body is invalid (missing folderId)", async () => {
    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 400 when body is invalid (missing folderName)", async () => {
    const response = await POST(createRequest({ folderId: "folder1" }));
    expect(response.status).toBe(400);
  });

  it("creates access request and sends email notification", async () => {
    const response = await POST(
      createRequest({
        folderId: "folder1",
        folderName: "Restricted Docs",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Permintaan akses dikirim ke Admin.",
    });
    expect(mockKvSAdd).toHaveBeenCalled();
    expect(mockKvSMembers).toHaveBeenCalledWith("zee-index:admins");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        subject: expect.stringContaining("Restricted Docs"),
      }),
    );
    expect(mockLogActivity).toHaveBeenCalled();
  });

  it("creates access request without email when no admins configured", async () => {
    mockKvSMembers.mockResolvedValue([]);

    const response = await POST(
      createRequest({
        folderId: "folder1",
        folderName: "Restricted Docs",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Permintaan akses dikirim ke Admin.",
    });
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("returns 500 when kv throws", async () => {
    mockKvSAdd.mockRejectedValue(new Error("redis down"));

    const response = await POST(
      createRequest({
        folderId: "folder1",
        folderName: "Restricted Docs",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Gagal memproses permintaan.",
    });
  });
});
