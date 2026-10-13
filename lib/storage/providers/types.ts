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
  /** Upstream status when serving a partial (Range) response, e.g. 206. */
  status?: number;
  /** Upstream Content-Range header (bytes a-b/total). */
  contentRange?: string | null;
  /** Actual byte count in the stream (range slice). */
  contentLength?: number | null;
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
  getDownload(
    fileId: string,
    range?: string | null,
  ): Promise<ProviderDownload | null>;
  uploadFile(
    parentId: string,
    fileName: string,
    buffer: Buffer,
    mimeType?: string,
  ): Promise<ZeeFile | null>;
  deleteFile(fileId: string): Promise<boolean>;

  // Optional: create a folder. When unimplemented, folder creation is
  // unsupported for that provider.
  createFolder?(parentId: string, folderName: string): Promise<ZeeFile | null>;

  // Optional: streaming upload session (Dropbox upload sessions, S3 multipart
  // uploads). When implemented, the route forwards chunks to the provider
  // instead of buffering the entire file in server memory. The provider
  // tracks the session and resolves the final path internally. `offset` is
  // the chunk's start byte from Content-Range; providers reject a chunk that
  // does not continue where the previous one ended with UploadSessionError.
  startUploadSession?(
    parentId: string,
    fileName: string,
    mimeType?: string,
  ): Promise<string>;
  appendUploadSession?(
    sessionToken: string,
    chunk: ArrayBuffer,
    offset?: number,
  ): Promise<void>;
  finishUploadSession?(
    sessionToken: string,
    chunk: ArrayBuffer,
    offset?: number,
  ): Promise<ZeeFile | null>;
}

/** A client mistake in an upload session: unknown session or a chunk out of order. */
export class UploadSessionError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404,
  ) {
    super(message);
    this.name = "UploadSessionError";
  }
}
