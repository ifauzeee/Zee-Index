import { Dropbox, DropboxAuth } from "dropbox";
import type { StorageProvider } from "./types";
import { getMimeType } from "../mime";
import type { ZeeFile } from "@/types/storage";
import { logger } from "@/lib/logger";

const ID_PREFIX = "dropbox:";

function basename(path: string): string {
  const cleaned = path.endsWith("/") ? path.slice(0, -1) : path;
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || cleaned;
}

export class DropboxStorageProvider implements StorageProvider {
  readonly idPrefix = ID_PREFIX;
  readonly rootId = ID_PREFIX;
  readonly rootName: string;
  readonly source = "dropbox" as const;

  private client: Dropbox;
  private basePath: string;

  constructor() {
    const accessToken = process.env.STORAGE_DROPBOX_ACCESS_TOKEN?.trim() || "";
    const refreshToken =
      process.env.STORAGE_DROPBOX_REFRESH_TOKEN?.trim() || "";
    const appKey = process.env.STORAGE_DROPBOX_APP_KEY?.trim() || "";
    const appSecret = process.env.STORAGE_DROPBOX_APP_SECRET?.trim() || "";
    this.basePath = process.env.STORAGE_DROPBOX_BASEPATH?.trim() || "";
    this.rootName = process.env.STORAGE_DROPBOX_ROOT_NAME?.trim() || "Dropbox";

    const auth = new DropboxAuth({
      accessToken,
      refreshToken: refreshToken || undefined,
      clientId: appKey || undefined,
      clientSecret: appSecret || undefined,
    });

    this.client = new Dropbox({ auth });
  }

  private toRemotePath(fileId: string): string {
    const raw = fileId.startsWith(ID_PREFIX)
      ? fileId.slice(ID_PREFIX.length)
      : fileId;

    if (!raw) return this.basePath || "";

    const base = this.basePath.replace(/\/$/, "");
    return base ? `${base}/${raw}`.replace(/\/\//g, "/") : `/${raw}`;
  }

  private toFileId(remotePath: string): string {
    const base = this.basePath.replace(/\/$/, "");
    let rel = remotePath;
    if (base && remotePath.startsWith(base)) {
      rel = remotePath.slice(base.length);
    }
    rel = rel.replace(/^\//, "");
    return `${ID_PREFIX}${rel}`;
  }

  private toZeeFile(entry: {
    ".tag"?: string;
    name?: string;
    path_lower?: string;
    path_display?: string;
    id?: string;
    size?: number;
    server_modified?: string;
    client_modified?: string;
    is_downloadable?: boolean;
  }): ZeeFile {
    const isFolder = entry[".tag"] === "folder";
    const name = entry.name || basename(entry.path_lower || "");
    const mimeType = isFolder
      ? "application/vnd.google-apps.folder"
      : getMimeType(name) || "application/octet-stream";

    return {
      id: this.toFileId(entry.path_lower || entry.path_display || ""),
      name,
      mimeType,
      isFolder,
      source: "dropbox",
      size: entry.size != null ? String(entry.size) : undefined,
      modifiedTime:
        entry.server_modified ||
        entry.client_modified ||
        new Date().toISOString(),
      hasThumbnail: mimeType.startsWith("image/"),
    };
  }

  async listFiles(
    folderId: string,
    opts?: { pageSize?: number; pageToken?: string | null },
  ): Promise<{ files: ZeeFile[]; nextPageToken: string | null }> {
    const remotePath =
      folderId === this.rootId
        ? this.basePath || ""
        : this.toRemotePath(folderId);

    try {
      let res;
      if (opts?.pageToken) {
        res = await this.client.filesListFolderContinue({
          cursor: opts.pageToken,
        });
      } else {
        res = await this.client.filesListFolder({
          path: remotePath || "",
          limit: opts?.pageSize || 100,
        });
      }

      const files = res.result.entries.map((entry) => this.toZeeFile(entry));
      return {
        files,
        nextPageToken: res.result.has_more ? (res.result.cursor ?? null) : null,
      };
    } catch (err) {
      logger.error({ err, folderId }, "[Dropbox] listFolder failed");
      return { files: [], nextPageToken: null };
    }
  }

  async getFileDetails(fileId: string): Promise<ZeeFile | null> {
    const remotePath = this.toRemotePath(fileId);
    try {
      const res = await this.client.filesGetMetadata({
        path: remotePath,
        include_deleted: false,
      });
      return this.toZeeFile(res.result as Parameters<typeof this.toZeeFile>[0]);
    } catch (err) {
      logger.error({ err, fileId }, "[Dropbox] getMetadata failed");
      return null;
    }
  }

  async getDownload(fileId: string): Promise<{
    stream: ReadableStream<Uint8Array>;
    size: number;
    mimeType: string;
    filename: string;
  } | null> {
    const remotePath = this.toRemotePath(fileId);
    try {
      const res = await this.client.filesDownload({ path: remotePath });
      const result = res.result as unknown as Record<string, unknown>;

      const name = (result.name as string) || basename(remotePath);
      const mimeType = getMimeType(name) || "application/octet-stream";
      const blob = (result.fileBlob ?? result.fileBinary) as
        Blob | ArrayBuffer | undefined;
      if (!blob) {
        logger.error(
          { keys: Object.keys(result), fileId },
          "[Dropbox] getDownload: no fileBlob/fileBinary",
        );
        return null;
      }

      const buffer =
        blob instanceof Blob
          ? Buffer.from(await blob.arrayBuffer())
          : Buffer.from(blob as ArrayBuffer);
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(buffer));
          controller.close();
        },
      });

      return {
        stream,
        size: (result.size as number) || buffer.byteLength,
        mimeType,
        filename: name,
      };
    } catch (err) {
      logger.error({ err, fileId }, "[Dropbox] download failed");
      return null;
    }
  }

  async uploadFile(
    parentId: string,
    fileName: string,
    buffer: Buffer,
    mimeType?: string,
  ): Promise<ZeeFile | null> {
    const parentPath =
      parentId === this.rootId
        ? this.basePath || ""
        : this.toRemotePath(parentId);
    const remotePath = `${parentPath.replace(/\/$/, "")}/${fileName}`.replace(
      /\/\//g,
      "/",
    );
    const resolvedMime =
      mimeType || getMimeType(fileName) || "application/octet-stream";

    try {
      await this.client.filesUpload({
        path: remotePath,
        contents: buffer,
        mode: { ".tag": "overwrite" },
        autorename: false,
      });

      return {
        id: this.toFileId(remotePath),
        name: fileName,
        mimeType: resolvedMime,
        isFolder: false,
        source: "dropbox",
        size: String(buffer.length),
        modifiedTime: new Date().toISOString(),
        hasThumbnail: resolvedMime.startsWith("image/"),
      };
    } catch (err) {
      logger.error({ err, remotePath }, "[Dropbox] upload failed");
      return null;
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const remotePath = this.toRemotePath(fileId);
    try {
      await this.client.filesDeleteV2({ path: remotePath });
      return true;
    } catch (err) {
      logger.error({ err, remotePath }, "[Dropbox] delete failed");
      return false;
    }
  }
}
