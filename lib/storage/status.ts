import { getActiveProvider } from "./providers";

export interface StorageStatus {
  provider: string;
  isExternalEnabled: boolean;
  isS3Enabled: boolean;
  isWebDavEnabled: boolean;
  s3?: {
    endpoint: string;
    region: string;
    bucket: string;
    forcePathStyle: boolean;
    rootName: string;
  };
  webdav?: {
    url: string;
    username: string;
    basePath: string;
    rootName: string;
  };
}

export function getStorageStatus(): StorageStatus {
  const provider = (process.env.STORAGE_PROVIDER || "google-drive").trim();
  const active = getActiveProvider();
  const isS3 = provider === "s3" && !!process.env.STORAGE_S3_BUCKET;
  const isWebDav = provider === "webdav" && !!process.env.STORAGE_WEBDAV_URL;

  const status: StorageStatus = {
    provider,
    isExternalEnabled: !!active,
    isS3Enabled: isS3,
    isWebDavEnabled: isWebDav,
  };

  if (isS3) {
    status.s3 = {
      endpoint: process.env.STORAGE_S3_ENDPOINT || "",
      region: process.env.STORAGE_S3_REGION || "",
      bucket: process.env.STORAGE_S3_BUCKET || "",
      forcePathStyle:
        (process.env.STORAGE_S3_FORCE_PATH_STYLE || "true").toLowerCase() !==
        "false",
      rootName: process.env.STORAGE_S3_ROOT_NAME || "S3 Storage",
    };
  }

  if (isWebDav) {
    status.webdav = {
      url: process.env.STORAGE_WEBDAV_URL || "",
      username: process.env.STORAGE_WEBDAV_USERNAME ? "••••" : "",
      basePath: process.env.STORAGE_WEBDAV_BASEPATH || "/",
      rootName: process.env.STORAGE_WEBDAV_ROOT_NAME || "WebDAV",
    };
  }

  return status;
}
