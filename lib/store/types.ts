export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
}

export interface NotificationItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  timestamp: number;
  read: boolean;
}

export interface ShareLink {
  id: string;
  path: string;
  token: string;
  jti: string;
  expiresAt: string;
  loginRequired: boolean;
  itemName: string;
  viewCount?: number;
  isCollection?: boolean;
}

export interface FileRequestLink {
  token: string;
  folderId: string;
  folderName: string;
  title: string;
  expiresAt: number;
  createdAt: number;
  type: "file-request";
}

export interface UserProfile {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: "USER" | "ADMIN" | "GUEST" | "EDITOR";
  isGuest?: boolean;
}

export type ViewMode = "list" | "grid" | "gallery";
export type SortKey = "name" | "size" | "modifiedTime";
export type SortOrder = "asc" | "desc";
export type DensityMode = "comfortable" | "compact";

export interface AppConfig {
  hideAuthor: boolean;
  disableGuestLogin: boolean;
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
}

export interface UISlice {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  density: DensityMode;
  setDensity: (density: DensityMode) => void;
  sort: { key: string; order: "asc" | "desc" };
  setSort: (key: any) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  notifications: NotificationItem[];
  isNotificationOpen: boolean;
  toggleNotificationCenter: () => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  isConfigLoading: boolean;
  fetchConfig: () => Promise<void>;
  setConfig: (config: Partial<AppConfig>) => Promise<void>;
  hideAuthor: boolean | null;
  disableGuestLogin: boolean | null;
}

export interface AuthSlice {
  user: UserProfile | null;
  fetchUser: () => Promise<void>;
  adminEmails: string[];
  isFetchingAdmins: boolean;
  fetchAdminEmails: () => Promise<void>;
  addAdminEmail: (email: string) => Promise<void>;
  removeAdminEmail: (email: string) => Promise<void>;
  editorEmails: string[];
  isFetchingEditors: boolean;
  fetchEditorEmails: () => Promise<void>;
  addEditorEmail: (email: string) => Promise<void>;
  removeEditorEmail: (email: string) => Promise<void>;
}

export interface FileSlice {
  refreshKey: number;
  triggerRefresh: () => void;
  isBulkMode: boolean;
  selectedFiles: any[];
  toggleSelection: (file: any) => void;
  setSelectedFiles: (files: any[]) => void;
  setBulkMode: (isActive: boolean) => void;
  clearSelection: () => void;
  shareToken: string | null;
  setShareToken: (token: string | null) => void;
  folderTokens: Record<string, string>;
  setFolderToken: (folderId: string, token: string) => void;
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  navigatingId: string | null;
  setNavigatingId: (id: string | null) => void;
  shareLinks: ShareLink[];
  fetchShareLinks: () => Promise<void>;
  addShareLink: (link: ShareLink) => void;
  removeShareLink: (link: ShareLink) => Promise<void>;
  fileRequests: FileRequestLink[];
  fetchFileRequests: () => Promise<void>;
  removeFileRequest: (token: string) => Promise<void>;
  dataUsage: {
    status: "idle" | "loading" | "success" | "error";
    value: string;
  };
  fetchDataUsage: () => Promise<void>;
  favorites: string[];
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (
    fileId: string,
    isCurrentlyFavorite: boolean,
  ) => Promise<void>;
  detailsFile: any | null;
  setDetailsFile: (file: any | null) => void;
  fileTags: Record<string, string[]>;
  fetchTags: (fileId: string) => Promise<void>;
  addTag: (fileId: string, tag: string) => Promise<void>;
  removeTag: (fileId: string, tag: string) => Promise<void>;
  pinnedFolders: any[];
  fetchPinnedFolders: () => Promise<void>;
  addPin: (folderId: string) => Promise<void>;
  removePin: (folderId: string) => Promise<void>;
  videoProgress: Record<string, number>;
  setVideoProgress: (fileId: string, time: number) => void;
  uploads: Record<
    string,
    {
      name: string;
      progress: number;
      status: "uploading" | "success" | "error";
      error?: string;
    }
  >;
  updateUploadProgress: (
    fileName: string,
    progress: number,
    status: "uploading" | "success" | "error",
    error?: string,
  ) => void;
  removeUpload: (fileName: string) => void;
}

export interface AudioSlice {
  activeAudioFile: any | null;
  audioQueue: any[];
  isAudioPlaying: boolean;
  playAudio: (file: any, queue?: any[]) => void;
  toggleAudioPlay: () => void;
  closeAudio: () => void;
  playNextTrack: () => void;
  playPrevTrack: () => void;
  addToQueue: (files: any[]) => void;
  removeFromQueue: (fileId: string) => void;
}

export type AppState = UISlice & AuthSlice & FileSlice & AudioSlice;
