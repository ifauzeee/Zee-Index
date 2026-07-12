import { describe, it, expect, beforeEach, vi } from "vitest";

describe("storage provider factory", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns an S3 provider when STORAGE_PROVIDER=s3 and bucket is set", async () => {
    process.env.STORAGE_PROVIDER = "s3";
    process.env.STORAGE_S3_BUCKET = "my-bucket";
    process.env.STORAGE_S3_ENDPOINT = "https://s3.example.com";
    process.env.STORAGE_S3_REGION = "auto";
    const mod = await import("@/lib/storage/providers");
    const provider = mod.getActiveProvider();
    expect(provider).not.toBeNull();
    expect(provider?.idPrefix).toBe("s3:");
    expect(provider?.rootId).toBe("s3:");
    expect(mod.isProviderId("s3:folder/abc")).toBe(true);
    expect(mod.isProviderId("drive-file-id")).toBe(false);
  });

  it("returns a WebDAV provider when STORAGE_PROVIDER=webdav and url is set", async () => {
    process.env.STORAGE_PROVIDER = "webdav";
    process.env.STORAGE_WEBDAV_URL = "https://dav.example.com";
    const mod = await import("@/lib/storage/providers");
    const provider = mod.getActiveProvider();
    expect(provider).not.toBeNull();
    expect(provider?.idPrefix).toBe("webdav:");
    expect(provider?.rootId).toBe("webdav:");
    expect(mod.isProviderId("webdav:path/file")).toBe(true);
  });

  it("returns null for google-drive default (no external provider)", async () => {
    process.env.STORAGE_PROVIDER = "google-drive";
    delete process.env.STORAGE_S3_BUCKET;
    delete process.env.STORAGE_WEBDAV_URL;
    const mod = await import("@/lib/storage/providers");
    expect(mod.getActiveProvider()).toBeNull();
    expect(mod.isProviderId("anything")).toBe(false);
  });

  it("returns null when s3 provider selected but bucket missing", async () => {
    process.env.STORAGE_PROVIDER = "s3";
    delete process.env.STORAGE_S3_BUCKET;
    const mod = await import("@/lib/storage/providers");
    expect(mod.getActiveProvider()).toBeNull();
  });
});
