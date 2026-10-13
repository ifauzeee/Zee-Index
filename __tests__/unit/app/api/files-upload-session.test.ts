import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UploadSessionError } from "@/lib/storage/providers/types";

const provider = vi.hoisted(() => ({
  rootId: "s3:",
  idPrefix: "s3:",
  uploadFile: vi.fn(),
  startUploadSession: vi.fn(),
  appendUploadSession: vi.fn(),
  finishUploadSession: vi.fn(),
}));

vi.mock("@/lib/editor-access", () => ({
  canModifyAll: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/api-middleware", () => ({
  createEditorRoute:
    (
      handler: (ctx: {
        request: NextRequest;
        session: object;
        query: Record<string, string>;
      }) => Promise<Response>,
    ) =>
    (request: NextRequest) =>
      handler({
        request,
        session: { user: { email: "editor@test.com", role: "EDITOR" } },
        query: Object.fromEntries(request.nextUrl.searchParams),
      }),
}));
vi.mock("@/lib/drive", () => ({ getAccessToken: vi.fn() }));
vi.mock("@/lib/activityLogger", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/cache", () => ({ invalidateFolderCache: vi.fn() }));
vi.mock("@/lib/storage/providers", () => ({
  getActiveProvider: () => provider,
}));

import { POST } from "@/app/api/files/upload/route";

function chunk(body: string, range: string) {
  return POST(
    new NextRequest(
      "http://localhost/api/files/upload?type=chunk&uploadUrl=provider-session%3A%2F%2Ftok&parentId=s3:",
      { method: "POST", body, headers: { "Content-Range": range } },
    ),
  );
}

describe("provider upload sessions (S3 multipart, Dropbox)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    provider.startUploadSession.mockResolvedValue("tok");
    provider.appendUploadSession.mockResolvedValue(undefined);
    provider.finishUploadSession.mockResolvedValue({
      id: "s3:a.mp4",
      name: "a.mp4",
      size: "6",
    });
  });

  it("starts a session with the file's MIME type", async () => {
    const request = new NextRequest(
      "http://localhost/api/files/upload?type=init",
      { method: "POST" },
    );
    Object.defineProperty(request, "json", {
      value: async () => ({
        name: "a.mp4",
        mimeType: "video/mp4",
        parentId: "s3:",
        size: 6,
      }),
    });

    const response = await POST(request);

    expect(await response.json()).toEqual({
      uploadUrl: "provider-session://tok",
    });
    expect(provider.startUploadSession).toHaveBeenCalledWith(
      "s3:",
      "a.mp4",
      "video/mp4",
    );
  });

  it("passes each chunk's start offset to the provider", async () => {
    expect((await chunk("aaa", "bytes 0-2/6")).status).toBe(200);
    expect((await chunk("bbb", "bytes 3-5/6")).status).toBe(200);

    expect(provider.appendUploadSession).toHaveBeenCalledWith(
      "tok",
      expect.any(ArrayBuffer),
      0,
    );
    expect(provider.finishUploadSession).toHaveBeenCalledWith(
      "tok",
      expect.any(ArrayBuffer),
      3,
    );
  });

  it("rejects a chunk whose length does not match its range", async () => {
    expect((await chunk("aaaa", "bytes 0-2/6")).status).toBe(400);
    expect(provider.appendUploadSession).not.toHaveBeenCalled();
  });

  it("rejects a chunk without Content-Range", async () => {
    expect((await chunk("aaa", "")).status).toBe(400);
  });

  it("maps provider session errors to their status", async () => {
    provider.appendUploadSession.mockRejectedValue(
      new UploadSessionError("out of order", 400),
    );
    expect((await chunk("aaa", "bytes 0-2/6")).status).toBe(400);

    provider.appendUploadSession.mockRejectedValue(
      new UploadSessionError("gone", 404),
    );
    expect((await chunk("aaa", "bytes 0-2/6")).status).toBe(404);
  });
});
