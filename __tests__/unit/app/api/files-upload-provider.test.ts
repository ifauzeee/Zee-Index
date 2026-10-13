import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockUploadFile } = vi.hoisted(() => ({ mockUploadFile: vi.fn() }));

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
  // S3/WebDAV: no upload sessions, so the route buffers chunks itself.
  getActiveProvider: () => ({
    rootId: "s3:",
    idPrefix: "s3:",
    uploadFile: mockUploadFile,
  }),
}));

import { POST } from "@/app/api/files/upload/route";

async function init(name: string, size: number): Promise<string> {
  const request = new NextRequest(
    "http://localhost/api/files/upload?type=init",
    { method: "POST" },
  );
  Object.defineProperty(request, "json", {
    value: async () => ({
      name,
      mimeType: "text/plain",
      parentId: "s3:",
      size,
    }),
  });
  const response = await POST(request);
  return (await response.json()).uploadUrl;
}

function chunk(uploadUrl: string, body: string, range: string) {
  return POST(
    new NextRequest(
      `http://localhost/api/files/upload?type=chunk&uploadUrl=${encodeURIComponent(uploadUrl)}&parentId=s3:`,
      { method: "POST", body, headers: { "Content-Range": range } },
    ),
  );
}

describe("provider uploads buffered in memory (Z2-15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadFile.mockImplementation(
      async (_parent: string, name: string, data: Buffer) => ({
        id: `s3:${name}`,
        name,
        size: String(data.length),
      }),
    );
  });

  it("keeps two uploads of the same file name apart", async () => {
    const first = await init("same.txt", 6);
    const second = await init("same.txt", 6);
    expect(first).not.toBe(second);

    await chunk(first, "aaa", "bytes 0-2/6");
    await chunk(second, "bbb", "bytes 0-2/6");
    await chunk(first, "AAA", "bytes 3-5/6");
    await chunk(second, "BBB", "bytes 3-5/6");

    const uploaded = mockUploadFile.mock.calls.map((call) =>
      (call[2] as Buffer).toString(),
    );
    expect(uploaded).toEqual(["aaaAAA", "bbbBBB"]);
    expect(mockUploadFile.mock.calls[0][1]).toBe("same.txt");
  });

  it("rejects an out-of-order chunk", async () => {
    const url = await init("a.txt", 6);

    const response = await chunk(url, "AAA", "bytes 3-5/6");

    expect(response.status).toBe(400);
  });

  it("rejects a chunk whose length does not match its range", async () => {
    const url = await init("a.txt", 6);

    expect((await chunk(url, "aaaa", "bytes 0-2/6")).status).toBe(400);
  });

  it("refuses an unknown or expired upload id", async () => {
    const response = await chunk(
      "provider-upload://not-a-session",
      "aaa",
      "bytes 0-2/3",
    );

    expect(response.status).toBe(404);
  });

  it("refuses files over the in-memory cap at init", async () => {
    const request = new NextRequest(
      "http://localhost/api/files/upload?type=init",
      { method: "POST" },
    );
    Object.defineProperty(request, "json", {
      value: async () => ({
        name: "big.bin",
        mimeType: "application/octet-stream",
        parentId: "s3:",
        size: 500 * 1024 * 1024,
      }),
    });

    expect((await POST(request)).status).toBe(413);
  });
});
