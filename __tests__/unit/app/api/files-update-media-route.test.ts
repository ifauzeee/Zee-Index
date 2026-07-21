import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAccessToken, mockInvalidateFolderCache } = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockInvalidateFolderCache: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
}));

vi.mock("@/lib/cache", () => ({
  invalidateFolderCache: mockInvalidateFolderCache,
}));

import { PATCH } from "@/app/api/files/update-media/route";

function makeRequest(formData: Record<string, any>) {
  const fd = new FormData();
  Object.entries(formData).forEach(([key, value]) => {
    if (key === "file") {
      fd.append("file", value);
    } else {
      fd.append(key, String(value));
    }
  });

  const req = new NextRequest("http://localhost:3000/api/files/update-media", {
    method: "PATCH",
  });
  // Override formData
  Object.defineProperty(req, "formData", {
    value: () => Promise.resolve(fd),
  });
  return req;
}

describe("app/api/files/update-media route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockResolvedValue("test-access-token");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "test-file-id", name: "test.jpg" }),
    });
  });

  it("updates media file successfully", async () => {
    const mockFile = Object.assign(
      new File(["test-content"], "test.jpg", { type: "image/jpeg" }),
      {
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(12)),
      },
    );
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "test-file-id", name: "test.jpg" }),
    });

    const response = await PATCH(
      makeRequest({
        file: mockFile,
        fileId: "test-file-id",
        parentId: "parent-id",
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("returns 400 when file or fileId is missing", async () => {
    const response = await PATCH(makeRequest({ fileId: "test-file-id" }));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Missing file");
  });

  it("returns 400 when fileId is missing", async () => {
    const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const response = await PATCH(makeRequest({ file: mockFile }));

    expect(response.status).toBe(400);
  });

  it("handles Google Drive API failure", async () => {
    const mockFile = new File(["test-content"], "test.jpg", {
      type: "image/jpeg",
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    });

    const response = await PATCH(
      makeRequest({ file: mockFile, fileId: "test-file-id" }),
    );

    expect(response.status).toBe(500);
  });
});
