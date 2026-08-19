import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockKvSmembers, mockKvSadd, mockKvSrem, mockLogActivity } = vi.hoisted(
  () => ({
    mockKvSmembers: vi.fn(),
    mockKvSadd: vi.fn(),
    mockKvSrem: vi.fn(),
    mockLogActivity: vi.fn(),
  }),
);

const { mockParseAccessRequestRecord, mockSerializeAccessRequestRecord } =
  vi.hoisted(() => ({
    mockParseAccessRequestRecord: vi.fn(),
    mockSerializeAccessRequestRecord: vi.fn(),
  }));

type RouteHandler = (ctx: {
  body?: unknown;
  request: NextRequest;
  session?: { user?: { email?: string } };
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
        return handler({
          body: parsed.data,
          request,
          session: { user: { email: "admin@example.com" } },
        });
      }
      return handler({
        body: raw,
        request,
        session: { user: { email: "admin@example.com" } },
      });
    };
  },
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    smembers: mockKvSmembers,
    sadd: mockKvSadd,
    srem: mockKvSrem,
  },
}));

vi.mock("@/lib/activityLogger", () => ({
  logActivity: mockLogActivity,
}));

vi.mock("@/lib/constants", () => ({
  REDIS_KEYS: { ACCESS_REQUESTS: "zee-index:access-requests" },
}));

vi.mock("@/lib/link-payloads", () => ({
  accessRequestActionSchema: {
    safeParse: (d: unknown) => ({ success: true, data: d }),
  },
  parseAccessRequestRecord: mockParseAccessRequestRecord,
  serializeAccessRequestRecord: mockSerializeAccessRequestRecord,
}));

import { GET, POST } from "@/app/api/admin/access-requests/route";

function makeRequest(method: string, body?: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/access-requests", {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("app/api/admin/access-requests GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvSmembers.mockResolvedValue([
      '{"folderId":"f1","email":"user@example.com","timestamp":200}',
      '{"folderId":"f2","email":"other@example.com","timestamp":100}',
    ]);
    mockParseAccessRequestRecord
      .mockReturnValueOnce({
        folderId: "f1",
        email: "user@example.com",
        timestamp: 200,
      })
      .mockReturnValueOnce({
        folderId: "f2",
        email: "other@example.com",
        timestamp: 100,
      });
  });

  it("returns sorted access requests", async () => {
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(2);
    expect(body[0].timestamp).toBe(200);
    expect(body[1].timestamp).toBe(100);
  });

  it("filters out null parsed records", async () => {
    mockParseAccessRequestRecord.mockReset();
    mockParseAccessRequestRecord.mockReturnValue(null);
    mockKvSmembers.mockResolvedValue(["invalid"]);
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  it("returns 500 on error", async () => {
    mockKvSmembers.mockRejectedValue(new Error("kv error"));
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(500);
  });
});

describe("app/api/admin/access-requests POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvSmembers.mockResolvedValue([
      '{"folderId":"f1","email":"user@example.com","timestamp":100}',
    ]);
    mockParseAccessRequestRecord.mockReturnValue({
      folderId: "f1",
      email: "user@example.com",
      timestamp: 100,
    });
    mockSerializeAccessRequestRecord.mockReturnValue(
      '{"folderId":"f1","email":"user@example.com","timestamp":100}',
    );
    mockKvSadd.mockResolvedValue(1);
    mockKvSrem.mockResolvedValue(1);
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("approves an access request", async () => {
    const response = await POST(
      makeRequest("POST", {
        action: "approve",
        requestData: {
          folderId: "f1",
          folderName: "Folder 1",
          email: "user@example.com",
          timestamp: 100,
        },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
    expect(mockKvSadd).toHaveBeenCalled();
    expect(mockKvSrem).toHaveBeenCalled();
    expect(mockLogActivity).toHaveBeenCalled();
  });

  it("rejects an access request without granting access", async () => {
    const response = await POST(
      makeRequest("POST", {
        action: "reject",
        requestData: {
          folderId: "f1",
          email: "user@example.com",
          timestamp: 100,
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(mockKvSadd).not.toHaveBeenCalled();
    expect(mockKvSrem).toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    mockKvSmembers.mockRejectedValue(new Error("kv error"));
    const response = await POST(
      makeRequest("POST", {
        action: "approve",
        requestData: {
          folderId: "f1",
          email: "user@example.com",
          timestamp: 100,
        },
      }),
    );
    expect(response.status).toBe(500);
  });
});
