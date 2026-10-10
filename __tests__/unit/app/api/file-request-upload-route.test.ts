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

import {
  escapeHtml,
  isAllowedResumableUploadUrl,
  isAllowedUploadSubfolder,
  isUploadTargetWithinRequest,
} from "@/app/api/file-request/upload/route";

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

  it("escapes HTML before interpolating untrusted values into emails", () => {
    expect(escapeHtml(`<img src=x onerror=alert("xss")>&'`)).toBe(
      "&lt;img src=x onerror=alert(&quot;xss&quot;)&gt;&amp;&#39;",
    );
  });

  it("rejects a subfolder that is only a traversal segment", () => {
    expect(isAllowedUploadSubfolder("..")).toBe(false);
    expect(isAllowedUploadSubfolder(".")).toBe(false);
    expect(isAllowedUploadSubfolder("")).toBe(false);
  });

  it("accepts a plain subfolder name", () => {
    expect(isAllowedUploadSubfolder("receipts")).toBe(true);
  });

  it("rejects an uploadUrl whose parent escapes the request folder via ..", () => {
    expect(
      isUploadTargetWithinRequest(
        "local-storage:public/../secret",
        "local-storage:public",
      ),
    ).toBe(false);
  });

  it("accepts an uploadUrl whose parent is the request folder", () => {
    expect(
      isUploadTargetWithinRequest(
        "local-storage:public",
        "local-storage:public",
      ),
    ).toBe(true);
  });

  it("accepts an uploadUrl whose parent is a descendant of the request folder", () => {
    expect(
      isUploadTargetWithinRequest(
        "local-storage:public/receipts",
        "local-storage:public",
      ),
    ).toBe(true);
  });

  it("rejects an uploadUrl that escapes the root entirely", () => {
    expect(
      isUploadTargetWithinRequest(
        "local-storage:../../etc",
        "local-storage:public",
      ),
    ).toBe(false);
  });
});
