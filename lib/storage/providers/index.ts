import type { StorageProvider } from "./types";
import { S3StorageProvider } from "./s3";
import { WebDavStorageProvider } from "./webdav";

let cached: StorageProvider | null | undefined;

export function getActiveProvider(): StorageProvider | null {
  if (cached !== undefined) return cached;
  const provider = (process.env.STORAGE_PROVIDER || "google-drive").trim();
  try {
    if (provider === "s3") {
      if (!process.env.STORAGE_S3_BUCKET) return (cached = null);
      return (cached = new S3StorageProvider());
    }
    if (provider === "webdav") {
      if (!process.env.STORAGE_WEBDAV_URL) return (cached = null);
      return (cached = new WebDavStorageProvider());
    }
  } catch {
    return (cached = null);
  }
  return (cached = null);
}

export function isProviderId(id: string): boolean {
  const provider = getActiveProvider();
  return !!provider && id.startsWith(provider.idPrefix);
}
