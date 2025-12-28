export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  createdTime: string;
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
  hasThumbnail: boolean;
  isFolder: boolean;
  isProtected?: boolean;
  parents?: string[];
  owners?: { displayName: string; emailAddress: string }[];
  lastModifyingUser?: { displayName: string };
  md5Checksum?: string;
  imageMediaMetadata?: { width: number; height: number };
  videoMediaMetadata?: {
    width: number;
    height: number;
    durationMillis: string;
  };
  trashed: boolean;
  sharedWithMeTime?: string;
}

export interface DriveRevision {
  id: string;
  modifiedTime: string;
  keepForever: boolean;
  size: string;
  originalFilename: string;
  lastModifyingUser?: { displayName: string };
}

export interface SharedDrive {
  id: string;
  name: string;
  kind: string;
  backgroundImageLink?: string;
}

export interface DriveListResponse {
  files?: DriveFile[];
  nextPageToken?: string | null;
  error?: { message: string };
}
