import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getMimeType } from "../mime";
import type {
  ProviderDownload,
  ProviderListResult,
  StorageProvider,
} from "./types";
import type { ZeeFile } from "@/types/storage";
import { logger } from "@/lib/logger";

const ID_PREFIX = "s3:";

function basename(key: string): string {
  const cleaned = key.endsWith("/") ? key.slice(0, -1) : key;
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || cleaned;
}

export class S3StorageProvider implements StorageProvider {
  readonly idPrefix = ID_PREFIX;
  readonly rootId = ID_PREFIX;
  readonly rootName: string;
  readonly source = "s3" as const;

  private client: S3Client;
  private bucket: string;

  constructor() {
    const endpoint = process.env.STORAGE_S3_ENDPOINT?.trim() || undefined;
    const region = process.env.STORAGE_S3_REGION?.trim() || "us-east-1";
    const accessKeyId = process.env.STORAGE_S3_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY?.trim();
    const forcePathStyle =
      (process.env.STORAGE_S3_FORCE_PATH_STYLE ?? "true").trim() !== "false";

    this.bucket = process.env.STORAGE_S3_BUCKET?.trim() || "";
    this.rootName = process.env.STORAGE_S3_ROOT_NAME?.trim() || "S3 Storage";

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  private toKey(folderId: string): string {
    const raw = folderId.startsWith(ID_PREFIX)
      ? folderId.slice(ID_PREFIX.length)
      : folderId;
    if (!raw) return "";
    return raw.endsWith("/") ? raw : `${raw}/`;
  }

  async listFiles(
    folderId: string,
    opts?: { pageSize?: number; pageToken?: string | null },
  ): Promise<ProviderListResult> {
    const prefix = this.toKey(folderId);
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      Delimiter: "/",
      MaxKeys: opts?.pageSize || 100,
      ContinuationToken: opts?.pageToken || undefined,
    });

    const res = await this.client.send(command);
    const files: ZeeFile[] = [];

    for (const cp of res.CommonPrefixes || []) {
      const key = cp.Prefix || "";
      files.push({
        id: `${ID_PREFIX}${key}`,
        name: basename(key),
        mimeType: "application/vnd.google-apps.folder",
        modifiedTime: new Date().toISOString(),
        isFolder: true,
        source: "s3",
        hasThumbnail: false,
        parents: [folderId],
      });
    }

    for (const obj of res.Contents || []) {
      if (!obj.Key || obj.Key === prefix) continue;
      const key = obj.Key;
      const mimeType = getMimeType(key) || "application/octet-stream";
      files.push({
        id: `${ID_PREFIX}${key}`,
        name: basename(key),
        mimeType,
        size: obj.Size != null ? String(obj.Size) : undefined,
        modifiedTime: (obj.LastModified || new Date()).toISOString(),
        isFolder: false,
        source: "s3",
        hasThumbnail: mimeType.startsWith("image/"),
        parents: [folderId],
      });
    }

    return {
      files,
      nextPageToken: res.NextContinuationToken || null,
    };
  }

  async getFileDetails(fileId: string): Promise<ZeeFile | null> {
    const key = fileId.startsWith(ID_PREFIX)
      ? fileId.slice(ID_PREFIX.length)
      : fileId;
    if (!key) return null;
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const mimeType =
        res.ContentType || getMimeType(key) || "application/octet-stream";
      return {
        id: fileId,
        name: basename(key),
        mimeType,
        size: res.ContentLength != null ? String(res.ContentLength) : undefined,
        modifiedTime: (res.LastModified || new Date()).toISOString(),
        isFolder: false,
        source: "s3",
        hasThumbnail: mimeType.startsWith("image/"),
      };
    } catch (err) {
      logger.error({ err, key }, "S3 head failed");
      return null;
    }
  }

  async getDownload(fileId: string): Promise<ProviderDownload | null> {
    const key = fileId.startsWith(ID_PREFIX)
      ? fileId.slice(ID_PREFIX.length)
      : fileId;
    if (!key) return null;
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const body = res.Body;
      if (!body) return null;
      return {
        stream: body.transformToWebStream(),
        size: res.ContentLength || 0,
        mimeType:
          res.ContentType || getMimeType(key) || "application/octet-stream",
        filename: basename(key),
      };
    } catch (err) {
      logger.error({ err, key }, "S3 download failed");
      return null;
    }
  }

  async uploadFile(
    parentId: string,
    fileName: string,
    buffer: Buffer,
    mimeType?: string,
  ): Promise<ZeeFile | null> {
    const parentKey = this.toKey(parentId).replace(/\/$/, "");
    const key = parentKey ? `${parentKey}/${fileName}` : fileName;
    const resolvedMime =
      mimeType || getMimeType(fileName) || "application/octet-stream";
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: resolvedMime,
        }),
      );
      return {
        id: `${ID_PREFIX}${key}`,
        name: fileName,
        mimeType: resolvedMime,
        size: String(buffer.length),
        modifiedTime: new Date().toISOString(),
        isFolder: false,
        source: "s3",
        hasThumbnail: resolvedMime.startsWith("image/"),
        parents: [parentId],
      };
    } catch (err) {
      logger.error({ err, key }, "S3 upload failed");
      return null;
    }
  }
}
