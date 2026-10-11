import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockSaveLocalChunk, mockKvDel, mockSendMail } = vi.hoisted(() => ({
  mockSaveLocalChunk: vi.fn(),
  mockKvDel: vi.fn(),
  mockSendMail: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (ctx: {
      request: NextRequest;
      query: Record<string, string>;
    }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => {
      const query = Object.fromEntries(
        new URL(request.url).searchParams,
      ) as Record<string, string>;
      return handler({ request, query });
    };
  },
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: vi.fn(),
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    hget: vi.fn(),
    del: mockKvDel,
  },
}));

vi.mock("@/lib/activityLogger", () => ({
  logActivity: vi.fn(),
}));

vi.mock("@/lib/mailer", () => ({
  sendMail: mockSendMail,
}));

vi.mock("@/lib/storage/local", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage/local")>();
  return {
    ...actual,
    saveLocalChunk: mockSaveLocalChunk,
  };
});

import { POST } from "@/app/api/file-request/upload/route";
import { LocalChunkRequestError } from "@/lib/storage/local";

const FILE_REQUEST = {
  token: "tok",
  folderId: "local-storage:requests",
  folderName: "Requests",
  title: "Test Request",
  expiresAt: Date.now() + 60_000,
  createdAt: Date.now(),
  type: "file-request",
};

function chunkRequest(uploadUrl: string) {
  return new NextRequest(
    `http://localhost:3000/api/file-request/upload?type=chunk&token=tok&uploadUrl=${encodeURIComponent(uploadUrl)}`,
    {
      method: "POST",
      body: "0123456789",
      headers: { "content-range": "bytes 0-9/20" },
    },
  );
}

describe("app/api/file-request/upload local chunk handling", () => {
  let kvHget: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    kvHget = (await import("@/lib/kv")).kv.hget as ReturnType<typeof vi.fn>;
    kvHget.mockResolvedValue(JSON.stringify(FILE_REQUEST));
    mockKvDel.mockResolvedValue(undefined);
    mockSendMail.mockResolvedValue(undefined);
  });

  it("maps a rejected chunk range to 400 with the validation message", async () => {
    mockSaveLocalChunk.mockRejectedValue(
      new LocalChunkRequestError("Content-Range tidak valid"),
    );

    const response = await POST(
      chunkRequest(
        "local-storage-upload://local-storage%3Arequests/report.pdf",
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Content-Range tidak valid",
    });
  });

  it("does not report a server-side write failure as an invalid Content-Range", async () => {
    mockSaveLocalChunk.mockRejectedValue(new Error("EACCES: disk full"));

    const response = await POST(
      chunkRequest(
        "local-storage-upload://local-storage%3Arequests/report.pdf",
      ),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Terjadi kesalahan internal.",
    });
  });

  it("returns success when cache invalidation fails after the file is saved", async () => {
    mockSaveLocalChunk.mockResolvedValue({
      status: "completed",
      file: {
        id: "local-storage:requests/report.pdf",
        name: "report.pdf",
        size: "20",
        mimeType: "application/pdf",
      },
    });
    mockKvDel.mockRejectedValue(new Error("redis down"));

    const response = await POST(
      chunkRequest(
        "local-storage-upload://local-storage%3Arequests/report.pdf",
      ),
    );

    // The chunk is on disk; a stale listing for one cache TTL must not be
    // reported to the uploader as a failed upload.
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "completed",
      file: { name: "report.pdf" },
    });
  });
});
