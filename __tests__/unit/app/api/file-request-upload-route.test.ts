import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: vi.fn(() => vi.fn()),
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: vi.fn(),
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    hget: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("@/lib/activityLogger", () => ({
  logActivity: vi.fn(),
}));

import { isAllowedResumableUploadUrl } from "@/app/api/file-request/upload/route";

describe("app/api/file-request/upload route", () => {
  it("accepts Google resumable upload URLs", () => {
    expect(
      isAllowedResumableUploadUrl(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=abc123",
      ),
    ).toBe(true);
  });

  it("rejects upload URLs from non-Google hosts", () => {
    expect(
      isAllowedResumableUploadUrl(
        "https://internal.example.com/upload/drive/v3/files?upload_id=abc123",
      ),
    ).toBe(false);
  });

  it("rejects upload URLs without an upload session id", () => {
    expect(
      isAllowedResumableUploadUrl(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      ),
    ).toBe(false);
  });
});
