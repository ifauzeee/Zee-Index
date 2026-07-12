export type StorageSource = "google-drive" | "local" | "s3" | "webdav";

export interface ZeeFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  createdTime?: string;
  isFolder: boolean;
  source: StorageSource;
  thumbnailLink?: string;
  hasThumbnail: boolean;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  path?: string;
  trashed?: boolean;
  isProtected?: boolean;
  owners?: { displayName: string; emailAddress: string }[];
  lastModifyingUser?: { displayName: string };
  imageMediaMetadata?: { width: number; height: number };
  videoMediaMetadata?: {
    width: number;
    height: number;
    durationMillis: string;
  };
  md5Checksum?: string;
  sharedWithMeTime?: string;
  shortcutDetails?: { targetId: string; targetMimeType: string };
}

export interface ListFilesOptions {
  folderId: string;
  pageToken?: string | null;
  pageSize?: number;
  useCache?: boolean;
}

export interface ListFilesResponse {
  files: ZeeFile[];
  nextPageToken: string | null;
}
