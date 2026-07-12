import { describe, it, expect, beforeEach, vi } from "vitest";

describe("storage status", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("reports google-drive default when no external provider is set", async () => {
    process.env.STORAGE_PROVIDER = "google-drive";
    delete process.env.STORAGE_S3_BUCKET;
    delete process.env.STORAGE_WEBDAV_URL;
    const { getStorageStatus } = await import("@/lib/storage/status");
    const status = getStorageStatus();
    expect(status.provider).toBe("google-drive");
    expect(status.isExternalEnabled).toBe(false);
    expect(status.isS3Enabled).toBe(false);
    expect(status.isWebDavEnabled).toBe(false);
  });

  it("reports masked S3 configuration when s3 is enabled", async () => {
    process.env.STORAGE_PROVIDER = "s3";
    process.env.STORAGE_S3_ENDPOINT = "https://s3.example.com";
    process.env.STORAGE_S3_REGION = "auto";
    process.env.STORAGE_S3_BUCKET = "my-bucket";
    process.env.STORAGE_S3_FORCE_PATH_STYLE = "false";
    process.env.STORAGE_S3_ROOT_NAME = "My S3";
    const { getStorageStatus } = await import("@/lib/storage/status");
    const status = getStorageStatus();
    expect(status.isS3Enabled).toBe(true);
    expect(status.isExternalEnabled).toBe(true);
    expect(status.s3).toEqual({
      endpoint: "https://s3.example.com",
      region: "auto",
      bucket: "my-bucket",
      forcePathStyle: false,
      rootName: "My S3",
    });
    expect(status.s3).not.toHaveProperty("secret");
  });

  it("masks the WebDAV username and never exposes the password", async () => {
    process.env.STORAGE_PROVIDER = "webdav";
    process.env.STORAGE_WEBDAV_URL = "https://dav.example.com";
    process.env.STORAGE_WEBDAV_USERNAME = "alice";
    process.env.STORAGE_WEBDAV_PASSWORD = "super-secret";
    process.env.STORAGE_WEBDAV_BASEPATH = "/files";
    const { getStorageStatus } = await import("@/lib/storage/status");
    const status = getStorageStatus();
    expect(status.isWebDavEnabled).toBe(true);
    expect(status.webdav?.username).toBe("••••");
    expect(JSON.stringify(status)).not.toContain("super-secret");
  });
});
