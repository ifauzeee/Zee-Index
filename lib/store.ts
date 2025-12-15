import { create } from "zustand";
import { persist } from "zustand/middleware";
import { formatBytes } from "@/lib/utils";

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

interface UserProfile {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: "USER" | "ADMIN" | "GUEST";
  isGuest?: boolean;
}

type ViewMode = "list" | "grid" | "gallery";
type SortKey = "name" | "size" | "modifiedTime";
type SortOrder = "asc" | "desc";
type DensityMode = "comfortable" | "compact";

interface AppConfig {
  hideAuthor: boolean;
  disableGuestLogin: boolean;
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
}

interface AppState {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  density: DensityMode;
  setDensity: (density: DensityMode) => void;
  sort: { key: SortKey; order: SortOrder };
  setSort: (key: SortKey) => void;
  refreshKey: number;
  triggerRefresh: () => void;

  isBulkMode: boolean;
  selectedFiles: any[];
  toggleSelection: (file: any) => void;
  setSelectedFiles: (files: any[]) => void;
  setBulkMode: (isActive: boolean) => void;
  clearSelection: () => void;

  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;

  shareToken: string | null;
  setShareToken: (token: string | null) => void;
  folderTokens: Record<string, string>;
  setFolderToken: (folderId: string, token: string) => void;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  notifications: NotificationItem[];
  isNotificationOpen: boolean;
  toggleNotificationCenter: () => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  user: UserProfile | null;
  fetchUser: () => Promise<void>;
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
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
  adminEmails: string[];
  isFetchingAdmins: boolean;
  fetchAdminEmails: () => Promise<void>;
  addAdminEmail: (email: string) => Promise<void>;
  removeAdminEmail: (email: string) => Promise<void>;
  favorites: string[];
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (
    fileId: string,
    isCurrentlyFavorite: boolean,
  ) => Promise<void>;
  detailsFile: any | null;
  setDetailsFile: (file: any | null) => void;
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

  hideAuthor: boolean | null;
  disableGuestLogin: boolean | null;
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  isConfigLoading: boolean;
  fetchConfig: () => Promise<void>;
  setConfig: (config: Partial<AppConfig>) => Promise<void>;

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
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: "list",
      setView: (view) => set({ view }),
      density: "comfortable",
      setDensity: (density) => set({ density }),
      sort: { key: "name", order: "asc" },
      setSort: (key) => {
        const currentSort = get().sort;
        const order =
          currentSort.key === key && currentSort.order === "asc"
            ? "desc"
            : "asc";
        set({ sort: { key, order } });
      },
      refreshKey: 0,
      triggerRefresh: () =>
        set((state) => ({ refreshKey: state.refreshKey + 1 })),

      isBulkMode: false,
      selectedFiles: [],
      setBulkMode: (isActive) => {
        if (!isActive) {
          set({ isBulkMode: false, selectedFiles: [] });
        } else {
          set({ isBulkMode: true });
        }
      },
      toggleSelection: (file) =>
        set((state) => {
          const isSelected = state.selectedFiles.some((f) => f.id === file.id);
          const newSelection = isSelected
            ? state.selectedFiles.filter((f) => f.id !== file.id)
            : [...state.selectedFiles, file];
          return { selectedFiles: newSelection };
        }),
      setSelectedFiles: (files) => set({ selectedFiles: files }),
      clearSelection: () => set({ selectedFiles: [], isBulkMode: false }),

      isSidebarOpen: true,
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

      shareToken: null,
      setShareToken: (token) => {
        set({
          shareToken:
            typeof token === "string" && token.length > 0 ? token : null,
        });
      },
      folderTokens: {},
      setFolderToken: (folderId, token) =>
        set((state) => ({
          folderTokens: { ...state.folderTokens, [folderId]: token },
        })),

      toasts: [],
      addToast: (toastDetails) => {
        const id = new Date().toISOString() + Math.random();
        const newToast = { ...toastDetails, id };

        const newNotification: NotificationItem = {
          id,
          message: toastDetails.message,
          type: toastDetails.type,
          timestamp: Date.now(),
          read: false,
        };
        set((state) => ({
          toasts: [...state.toasts, newToast],
          notifications: [newNotification, ...state.notifications].slice(0, 50),
        }));
      },
      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        }));
      },

      notifications: [],
      isNotificationOpen: false,
      toggleNotificationCenter: () =>
        set((state) => ({ isNotificationOpen: !state.isNotificationOpen })),
      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      clearNotifications: () => set({ notifications: [] }),

      user: null,
      fetchUser: async () => {
        try {
          const response = await fetch("/api/auth/me");
          if (response.ok) {
            const data = await response.json();
            set({ user: data.user });
          } else {
            set({ user: null });
          }
        } catch {
          set({ user: null });
        }
      },
      currentFolderId: null,
      setCurrentFolderId: (id) => set({ currentFolderId: id }),

      shareLinks: [],
      fetchShareLinks: async () => {
        try {
          const response = await fetch("/api/share/list");
          if (!response.ok) {
            throw new Error("Failed to fetch share link list.");
          }
          const links: ShareLink[] = await response.json();
          links.sort(
            (a, b) =>
              new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime(),
          );
          set({ shareLinks: links });
        } catch (error: unknown) {
          get().addToast({
            message: error instanceof Error ? error.message : "Error",
            type: "error",
          });
        }
      },
      addShareLink: (link) =>
        set((state) => {
          const updatedLinks = [...state.shareLinks, link];
          updatedLinks.sort(
            (a, b) =>
              new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime(),
          );
          return { shareLinks: updatedLinks };
        }),
      removeShareLink: async (linkToRemove) => {
        const originalLinks = get().shareLinks;
        set((state) => ({
          shareLinks: state.shareLinks.filter(
            (link) => link.id !== linkToRemove.id,
          ),
        }));
        try {
          const response = await fetch("/api/share/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(linkToRemove),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Failed to delete link.");
          get().addToast({
            message: "Link successfully deleted.",
            type: "success",
          });
        } catch (error: unknown) {
          get().addToast({
            message: error instanceof Error ? error.message : "Error",
            type: "error",
          });
          set({ shareLinks: originalLinks });
        }
      },

      fileRequests: [],
      fetchFileRequests: async () => {
        try {
          const response = await fetch("/api/file-request");
          if (!response.ok) throw new Error("Failed to fetch request data.");
          const requests: FileRequestLink[] = await response.json();
          requests.sort((a, b) => b.expiresAt - a.expiresAt);
          set({ fileRequests: requests });
        } catch (error: unknown) {
          console.error("Fetch file requests failed", error);
        }
      },
      removeFileRequest: async (token) => {
        const original = get().fileRequests;
        set((state) => ({
          fileRequests: state.fileRequests.filter((r) => r.token !== token),
        }));
        try {
          const response = await fetch("/api/file-request", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          if (!response.ok) throw new Error("Failed to delete");
          get().addToast({ message: "Request link deleted", type: "success" });
        } catch {
          set({ fileRequests: original });
          get().addToast({
            message: "Failed to delete request link",
            type: "error",
          });
        }
      },

      dataUsage: { status: "idle", value: "Loading..." },
      fetchDataUsage: async () => {
        set((state) => ({
          dataUsage: { ...state.dataUsage, status: "loading" },
        }));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch("/api/datausage", {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!response.ok) throw new Error("Failed to fetch usage data.");
          const data = await response.json();

          const formattedUsage = formatBytes(data.totalUsage);

          set({ dataUsage: { status: "success", value: formattedUsage } });
        } catch (error: unknown) {
          clearTimeout(timeoutId);
          set((state) => ({
            dataUsage: {
              status: "error",
              value:
                state.dataUsage.value !== "Loading..."
                  ? state.dataUsage.value
                  : "Failed",
            },
          }));
          console.error("Failed to fetch data usage", error);
        }
      },
      adminEmails: [],
      isFetchingAdmins: false,
      fetchAdminEmails: async () => {
        set({ isFetchingAdmins: true });
        try {
          const response = await fetch("/api/admin/users");
          if (!response.ok) throw new Error("Failed to fetch admin list");
          const emails = await response.json();
          set({ adminEmails: emails });
        } catch (error: unknown) {
          get().addToast({
            message: error instanceof Error ? error.message : "Error",
            type: "error",
          });
        } finally {
          set({ isFetchingAdmins: false });
        }
      },
      addAdminEmail: async (email: string) => {
        try {
          const response = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Failed to add admin.");
          set((state) => ({
            adminEmails: [...state.adminEmails, email].sort(),
          }));
          get().addToast({ message: result.message, type: "success" });
        } catch (error: unknown) {
          get().addToast({
            message: error instanceof Error ? error.message : "Error",
            type: "error",
          });
        }
      },
      removeAdminEmail: async (email: string) => {
        const originalAdmins = get().adminEmails;
        set((state) => ({
          adminEmails: state.adminEmails.filter(
            (adminEmail) => adminEmail !== email,
          ),
        }));
        try {
          const response = await fetch("/api/admin/users", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Failed to remove admin.");
          get().addToast({ message: result.message, type: "success" });
        } catch (error: unknown) {
          get().addToast({
            message: error instanceof Error ? error.message : "Error",
            type: "error",
          });
          set({ adminEmails: originalAdmins });
        }
      },
      favorites: [],
      fetchFavorites: async () => {
        try {
          const response = await fetch("/api/favorites");
          if (!response.ok) return;
          const files: any[] = await response.json();
          set({ favorites: files.map((f) => f.id) });
        } catch (error) {
          console.error("Failed to fetch favorites:", error);
        }
      },
      toggleFavorite: async (fileId, isCurrentlyFavorite) => {
        const originalFavorites = get().favorites;
        const apiPath = isCurrentlyFavorite
          ? "/api/favorites/remove"
          : "/api/favorites/add";
        const newFavorites = isCurrentlyFavorite
          ? originalFavorites.filter((id) => id !== fileId)
          : [...originalFavorites, fileId];
        set({ favorites: newFavorites });

        try {
          const response = await fetch(apiPath, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId }),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || "Failed to update favorites.");
          }
          get().addToast({ message: result.message, type: "success" });
        } catch (error: unknown) {
          get().addToast({
            message: error instanceof Error ? error.message : "Error",
            type: "error",
          });
          set({ favorites: originalFavorites });
        }
      },
      detailsFile: null,
      setDetailsFile: (file) => set({ detailsFile: file }),

      activeAudioFile: null,
      audioQueue: [],
      isAudioPlaying: false,
      playAudio: (file, queue = []) =>
        set({
          activeAudioFile: file,
          isAudioPlaying: true,
          audioQueue: queue.length > 0 ? queue : [file],
        }),
      addToQueue: (files) =>
        set((state) => {
          const newFiles = files.filter(
            (f) => !state.audioQueue.find((q) => q.id === f.id),
          );
          return { audioQueue: [...state.audioQueue, ...newFiles] };
        }),
      removeFromQueue: (fileId) =>
        set((state) => ({
          audioQueue: state.audioQueue.filter((f) => f.id !== fileId),
        })),
      playNextTrack: () => {
        const { activeAudioFile, audioQueue } = get();
        if (!activeAudioFile || audioQueue.length === 0) return;
        const currentIndex = audioQueue.findIndex(
          (f) => f.id === activeAudioFile.id,
        );
        if (currentIndex < audioQueue.length - 1) {
          set({ activeAudioFile: audioQueue[currentIndex + 1] });
        }
      },
      playPrevTrack: () => {
        const { activeAudioFile, audioQueue } = get();
        if (!activeAudioFile || audioQueue.length === 0) return;
        const currentIndex = audioQueue.findIndex(
          (f) => f.id === activeAudioFile.id,
        );
        if (currentIndex > 0) {
          set({ activeAudioFile: audioQueue[currentIndex - 1] });
        }
      },
      toggleAudioPlay: () =>
        set((state) => ({ isAudioPlaying: !state.isAudioPlaying })),
      closeAudio: () =>
        set({ activeAudioFile: null, isAudioPlaying: false, audioQueue: [] }),

      hideAuthor: null,
      disableGuestLogin: null,
      appName: "Zee Index",
      logoUrl: "",
      faviconUrl: "",
      primaryColor: "",
      isConfigLoading: false,
      fetchConfig: async () => {
        set({ isConfigLoading: true });
        try {
          const response = await fetch("/api/admin/config");
          const config: AppConfig = await response.json();
          set({
            hideAuthor: config.hideAuthor || false,
            disableGuestLogin: config.disableGuestLogin || false,
            appName: config.appName || "Zee Index",
            logoUrl: config.logoUrl || "",
            faviconUrl: config.faviconUrl || "",
            primaryColor: config.primaryColor || "",
          });
        } catch (error) {
          console.error("Failed to fetch config:", error);
          set({ hideAuthor: true, disableGuestLogin: true });
        } finally {
          set({ isConfigLoading: false });
        }
      },
      setConfig: async (config) => {
        try {
          const response = await fetch("/api/admin/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);

          set((state) => ({
            ...state,
            ...result.config,
          }));
        } catch (error: unknown) {
          get().addToast({
            message: error instanceof Error ? error.message : "Error",
            type: "error",
          });
        }
      },

      fileTags: {},
      fetchTags: async (fileId) => {
        try {
          const response = await fetch(`/api/tags?fileId=${fileId}`);
          if (response.ok) {
            const data = await response.json();
            const tags = Array.isArray(data) ? data : data.tags || [];
            set((state) => ({
              fileTags: { ...state.fileTags, [fileId]: tags },
            }));
          }
        } catch (error) {
          console.error("Failed to fetch tags", error);
        }
      },
      addTag: async (fileId, tag) => {
        try {
          const response = await fetch("/api/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId, tag, action: "add" }),
          });
          if (response.ok) {
            const currentTags = get().fileTags[fileId] || [];
            if (!currentTags.includes(tag)) {
              const newTags = [...currentTags, tag];
              set((state) => ({
                fileTags: { ...state.fileTags, [fileId]: newTags },
              }));
            }
          }
        } catch (error) {
          console.error("Failed to add tag", error);
        }
      },
      removeTag: async (fileId, tag) => {
        try {
          const response = await fetch("/api/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId, tag, action: "remove" }),
          });
          if (response.ok) {
            const currentTags = get().fileTags[fileId] || [];
            const newTags = currentTags.filter((t) => t !== tag);
            set((state) => ({
              fileTags: { ...state.fileTags, [fileId]: newTags },
            }));
          }
        } catch (error) {
          console.error("Failed to remove tag", error);
        }
      },

      pinnedFolders: [],
      fetchPinnedFolders: async () => {
        try {
          const response = await fetch("/api/pinned");
          if (response.ok) {
            const data = await response.json();
            set({ pinnedFolders: data });
          }
        } catch (error) {
          console.error("Failed to fetch pinned folders", error);
        }
      },
      addPin: async (folderId) => {
        try {
          const response = await fetch("/api/pinned", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId }),
          });
          if (response.ok) {
            get().addToast({ message: "Folder pinned!", type: "success" });
            get().fetchPinnedFolders();
          }
        } catch {
          get().addToast({
            message: "Failed to pin folder",
            type: "error",
          });
        }
      },
      removePin: async (folderId) => {
        try {
          const response = await fetch("/api/pinned", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId }),
          });
          if (response.ok) {
            get().addToast({ message: "Pin removed!", type: "success" });
            set((state) => ({
              pinnedFolders: state.pinnedFolders.filter(
                (f) => f.id !== folderId,
              ),
            }));
            get().fetchPinnedFolders();
          }
        } catch {
          get().addToast({ message: "Failed to remove pin", type: "error" });
        }
      },

      videoProgress: {},
      setVideoProgress: (fileId, time) =>
        set((state) => ({
          videoProgress: { ...state.videoProgress, [fileId]: time },
        })),
    }),
    {
      name: "zee-index-storage",
      partialize: (state) => ({
        view: state.view,
        density: state.density,
        sort: state.sort,
        notifications: state.notifications,
        isSidebarOpen: state.isSidebarOpen,
        audioQueue: state.audioQueue,
        activeAudioFile: state.activeAudioFile,
        appName: state.appName,
        logoUrl: state.logoUrl,
        faviconUrl: state.faviconUrl,
        primaryColor: state.primaryColor,
        videoProgress: state.videoProgress,
      }),
    },
  ),
);
