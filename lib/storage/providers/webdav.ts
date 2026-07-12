import {
  createClient,
  type WebDAVClient,
  type FileStat,
  type ResponseDataDetailed,
} from "webdav";
import { Readable } from "stream";
import type { StorageProvider } from "./types";
import { getMimeType } from "../mime";
import { logger } from "@/lib/logger";

function unwrapDetailed<T>(result: T | ResponseDataDetailed<T>): T {
  if (
    result &&
    typeof result === "object" &&
    "data" in (result as Record<string, unknown>)
  ) {
    return (result as ResponseDataDetailed<T>).data;
  }
  return result as T;
}

export class WebDavStorageProvider implements StorageProvider {
  public readonly source = "webdav" as const;
  public readonly idPrefix = "webdav:";
  public readonly rootId = "webdav:";
  public readonly rootName: string;
  private readonly basePath: string;
  private readonly client: WebDAVClient;

  constructor() {
    const url = process.env.STORAGE_WEBDAV_URL?.replace(/\/$/, "") ?? "";
    const username = process.env.STORAGE_WEBDAV_USERNAME ?? "";
    const password = process.env.STORAGE_WEBDAV_PASSWORD ?? "";
    this.basePath = process.env.STORAGE_WEBDAV_BASEPATH || "/";
    this.rootName = process.env.STORAGE_WEBDAV_ROOT_NAME || "WebDAV";
    this.client = createClient(url, { username, password });
  }

  private toRemotePath(fileId: string): string {
    const rel = fileId.startsWith(this.idPrefix)
      ? fileId.slice(this.idPrefix.length)
      : fileId;
    return `${this.basePath.replace(/\/$/, "")}/${rel}`.replace(/\/\//g, "/");
  }

  private toFileId(remotePath: string): string {
    const base = this.basePath.replace(/\/$/, "");
    let rel = remotePath;
    if (base && remotePath.startsWith(base)) {
      rel = remotePath.slice(base.length);
    }
    rel = rel.replace(/^\//, "");
    return `${this.idPrefix}${rel}`;
  }

  async listFiles(folderId: string): Promise<{
    files: import("@/types/storage").ZeeFile[];
    nextPageToken: string | null;
  }> {
    const remotePath =
      folderId === this.rootId ? this.basePath : this.toRemotePath(folderId);
    const result = await this.client.getDirectoryContents(remotePath, {
      details: true,
      deep: false,
    });
    const items = unwrapDetailed<FileStat[]>(result);
    const files = items
      .filter((item) => item.basename !== "")
      .map((item) => this.toZeeFile(item));
    return { files, nextPageToken: null };
  }

  private toZeeFile(item: FileStat): import("@/types/storage").ZeeFile {
    const isFolder = item.type === "directory";
    return {
      id: this.toFileId(item.filename),
      name: item.basename,
      mimeType: isFolder
        ? "application/vnd.google-apps.folder"
        : item.mime || getMimeType(item.basename) || "application/octet-stream",
      isFolder,
      source: this.source,
      size: item.size != null ? String(item.size) : undefined,
      modifiedTime: item.lastmod,
      hasThumbnail: false,
    };
  }

  async getFileDetails(
    fileId: string,
  ): Promise<import("@/types/storage").ZeeFile | null> {
    const remotePath = this.toRemotePath(fileId);
    try {
      const statResult = await this.client.stat(remotePath, { details: true });
      const item = unwrapDetailed<FileStat>(statResult);
      return this.toZeeFile(item);
    } catch (error) {
      logger.error({ err: error, fileId }, "[WebDAV] stat failed");
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
      const statResult = await this.client.stat(remotePath, { details: true });
      const item = unwrapDetailed<FileStat>(statResult);
      const nodeStream = this.client.createReadStream(remotePath);
      const webStream = Readable.toWeb(nodeStream);
      return {
        stream: webStream as ReadableStream<Uint8Array>,
        size: item.size,
        mimeType:
          item.mime || getMimeType(item.basename) || "application/octet-stream",
        filename: item.basename,
      };
    } catch (error) {
      logger.error({ err: error, fileId }, "[WebDAV] download failed");
      return null;
    }
  }

  async uploadFile(
    parentId: string,
    fileName: string,
    buffer: Buffer,
    mimeType?: string,
  ): Promise<import("@/types/storage").ZeeFile | null> {
    const parentRemote =
      parentId === this.rootId ? this.basePath : this.toRemotePath(parentId);
    const remotePath = `${parentRemote.replace(/\/$/, "")}/${fileName}`.replace(
      /\/\//g,
      "/",
    );
    await this.client.putFileContents(remotePath, buffer, {
      overwrite: true,
      contentLength: buffer.length,
    });
    return {
      id: this.toFileId(remotePath),
      name: fileName,
      mimeType: mimeType || getMimeType(fileName) || "application/octet-stream",
      isFolder: false,
      source: this.source,
      size: String(buffer.length),
      modifiedTime: new Date().toISOString(),
      hasThumbnail: false,
    };
  }
}
