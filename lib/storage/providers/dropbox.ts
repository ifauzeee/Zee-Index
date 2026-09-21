import { Dropbox, DropboxAuth } from "dropbox";
import type { ProviderDownload, StorageProvider } from "./types";
import { getMimeType } from "../mime";
import type { ZeeFile } from "@/types/storage";
import { logger } from "@/lib/logger";
import { posix } from "path";

const ID_PREFIX = "dropbox:";

function basename(path: string): string {
  return posix.basename(path);
}

export class DropboxStorageProvider implements StorageProvider {
  readonly idPrefix = ID_PREFIX;
  readonly rootId = ID_PREFIX;
  readonly rootName: string;
  readonly source = "dropbox" as const;

  private client: Dropbox;
  private auth: DropboxAuth;
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
    this.auth = auth;
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

  async getDownload(
    fileId: string,
    range?: string | null,
  ): Promise<ProviderDownload | null> {
    const remotePath = this.toRemotePath(fileId);
    try {
      let token = this.auth.getAccessToken();
      if (!token) {
        await this.auth.refreshAccessToken();
        token = this.auth.getAccessToken();
      }
      if (!token) {
        logger.error({ fileId }, "[Dropbox] no access token available");
        return null;
      }

      const linkRes = await fetch(
        "https://api.dropboxapi.com/2/files/get_temporary_link",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: remotePath }),
        },
      );
      if (!linkRes.ok) {
        logger.error(
          { status: linkRes.status, fileId },
          "[Dropbox] get_temporary_link failed",
        );
        return null;
      }

      const linkData = (await linkRes.json()) as {
        link?: string;
        metadata?: { name?: string; size?: number };
      };
      const link = linkData.link;
      if (!link) {
        logger.error({ fileId }, "[Dropbox] get_temporary_link: no link");
        return null;
      }

      const name = linkData.metadata?.name || basename(remotePath);
      const size = linkData.metadata?.size ?? 0;

      const headers: Record<string, string> = {
        "User-Agent": "Zee-Index-Streamer/1.0",
      };
      if (range) headers.Range = range;

      let upstream = await fetch(link, { headers, cache: "no-store" });
      if (upstream.status === 401 || upstream.status === 403) {
        // temp link expired or invalidated; fetch a fresh link and retry once
        const retryLinkRes = await fetch(
          "https://api.dropboxapi.com/2/files/get_temporary_link",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: remotePath }),
          },
        );
        if (retryLinkRes.ok) {
          const retryLinkData = (await retryLinkRes.json()) as {
            link?: string;
          };
          if (retryLinkData.link) {
            upstream = await fetch(retryLinkData.link, {
              headers: range ? { ...headers, Range: range } : headers,
              cache: "no-store",
            });
          }
        }
      }
      if (!upstream.ok) {
        logger.error(
          { status: upstream.status, fileId },
          "[Dropbox] download failed",
        );
        return null;
      }

      const contentRange = upstream.headers.get("Content-Range");
      const rawLength = upstream.headers.get("Content-Length");

      return {
        stream: upstream.body as unknown as ReadableStream<Uint8Array>,
        size,
        mimeType: getMimeType(name) || "application/octet-stream",
        filename: name,
        status: upstream.status,
        contentRange,
        contentLength: rawLength ? parseInt(rawLength, 10) : null,
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

  async createFolder(
    parentId: string,
    folderName: string,
  ): Promise<ZeeFile | null> {
    const parentPath =
      parentId === this.rootId
        ? this.basePath || ""
        : this.toRemotePath(parentId);
    const remotePath = `${parentPath.replace(/\/$/, "")}/${folderName}`.replace(
      /\/\//g,
      "/",
    );

    try {
      const res = await this.client.filesCreateFolderV2({ path: remotePath });
      const entry = res.result.metadata as Parameters<typeof this.toZeeFile>[0];
      // create_folder_v2 returns FolderMetadataReference which may omit ".tag"
      return this.toZeeFile({ ...entry, ".tag": "folder" });
    } catch (err) {
      logger.error({ err, remotePath }, "[Dropbox] createFolder failed");
      return null;
    }
  }

  // ponytail: single-process session map; sessions leak on upload abort and are
  // lost on restart (Dropbox sessions expire after 7 days anyway, their own
  // cleanup). Not worth a DB table until multi-instance deployment.
  private sessions = new Map<
    string,
    { sessionId: string; offset: number; remotePath: string }
  >();

  async startUploadSession(
    parentId: string,
    fileName: string,
  ): Promise<string> {
    const parentPath =
      parentId === this.rootId
        ? this.basePath || ""
        : this.toRemotePath(parentId);
    const remotePath = `${parentPath.replace(/\/$/, "")}/${fileName}`.replace(
      /\/\//g,
      "/",
    );

    try {
      const res = await this.client.filesUploadSessionStart({
        contents: new ArrayBuffer(0),
        close: false,
      });
      const token = crypto.randomUUID();
      this.sessions.set(token, {
        sessionId: res.result.session_id,
        offset: 0,
        remotePath,
      });
      return token;
    } catch (err) {
      logger.error({ err, remotePath }, "[Dropbox] startUploadSession failed");
      throw err;
    }
  }

  async appendUploadSession(
    sessionToken: string,
    chunk: ArrayBuffer,
  ): Promise<void> {
    const session = this.sessions.get(sessionToken);
    if (!session) {
      throw new Error("Dropbox upload session tidak ditemukan.");
    }

    try {
      await this.client.filesUploadSessionAppendV2({
        cursor: {
          session_id: session.sessionId,
          offset: session.offset,
        },
        contents: chunk,
        close: false,
      });
      session.offset += chunk.byteLength;
    } catch (err) {
      logger.error(
        { err, sessionToken, offset: session.offset },
        "[Dropbox] appendUploadSession failed",
      );
      throw err;
    }
  }

  async finishUploadSession(
    sessionToken: string,
    chunk: ArrayBuffer,
  ): Promise<ZeeFile | null> {
    const session = this.sessions.get(sessionToken);
    if (!session) {
      throw new Error("Dropbox upload session tidak ditemukan.");
    }

    try {
      const res = await this.client.filesUploadSessionFinish({
        cursor: {
          session_id: session.sessionId,
          offset: session.offset,
        },
        contents: chunk,
        commit: {
          path: session.remotePath,
          mode: { ".tag": "overwrite" },
          autorename: false,
        },
      });
      this.sessions.delete(sessionToken);

      const meta = res.result as Parameters<typeof this.toZeeFile>[0];
      return this.toZeeFile(meta);
    } catch (err) {
      logger.error(
        { err, sessionToken, remotePath: session.remotePath },
        "[Dropbox] finishUploadSession failed",
      );
      this.sessions.delete(sessionToken);
      return null;
    }
  }
}
