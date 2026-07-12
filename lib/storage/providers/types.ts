import type { ZeeFile } from "@/types/storage";

export interface ListFilesOptions {
  pageSize?: number;
  pageToken?: string | null;
}

export interface ProviderListResult {
  files: ZeeFile[];
  nextPageToken: string | null;
}

export interface ProviderDownload {
  stream: ReadableStream<Uint8Array>;
  size: number;
  mimeType: string;
  filename: string;
}

export interface StorageProvider {
  /** Prefix used to encode provider file/folder ids, e.g. "s3:". */
  readonly idPrefix: string;
  /** Virtual root id for this provider. */
  readonly rootId: string;
  /** Human-readable root name. */
  readonly rootName: string;
  /** Source tag used on ZeeFile.source. */
  readonly source: "s3" | "webdav";

  listFiles(
    folderId: string,
    opts?: ListFilesOptions,
  ): Promise<ProviderListResult>;
  getFileDetails(fileId: string): Promise<ZeeFile | null>;
  getDownload(fileId: string): Promise<ProviderDownload | null>;
  uploadFile(
    parentId: string,
    fileName: string,
    buffer: Buffer,
    mimeType?: string,
  ): Promise<ZeeFile | null>;
}
