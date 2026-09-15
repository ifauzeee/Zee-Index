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
  readonly source: "s3" | "webdav" | "dropbox";

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
  deleteFile(fileId: string): Promise<boolean>;

  // Optional: streaming upload session (for providers with chunked session APIs
  // like Dropbox). When implemented, the route streams chunks directly to the
  // provider without buffering the entire file in server memory. The provider
  // tracks the session and resolves the final path internally.
  startUploadSession?(parentId: string, fileName: string): Promise<string>;
  appendUploadSession?(sessionToken: string, chunk: ArrayBuffer): Promise<void>;
  finishUploadSession?(
    sessionToken: string,
    chunk: ArrayBuffer,
  ): Promise<ZeeFile | null>;
}
