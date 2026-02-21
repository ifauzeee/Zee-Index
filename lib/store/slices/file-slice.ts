import { StateCreator } from "zustand";
import { AppState, FileSlice, ShareLink, FileRequestLink } from "../types";
import { formatBytes } from "@/lib/utils";

export const createFileSlice: StateCreator<AppState, [], [], FileSlice> = (
  set,
  get,
) => ({
  refreshKey: 0,
  triggerRefresh: () =>
    set((state: AppState) => ({ refreshKey: state.refreshKey + 1 })),
  isBulkMode: false,
  selectedFiles: [],
  setBulkMode: (isActive: boolean) => {
    if (!isActive) {
      set({ isBulkMode: false, selectedFiles: [] });
    } else {
      set({ isBulkMode: true });
    }
  },
  toggleSelection: (file: any) =>
    set((state: AppState) => {
      const isSelected = state.selectedFiles.some((f) => f.id === file.id);
      const newSelection = isSelected
        ? state.selectedFiles.filter((f) => f.id !== file.id)
        : [...state.selectedFiles, file];
      return { selectedFiles: newSelection };
    }),
  setSelectedFiles: (files: any[]) => set({ selectedFiles: files }),
  clearSelection: () => set({ selectedFiles: [], isBulkMode: false }),
  shareToken: null,
  setShareToken: (token: string | null) =>
    set({
      shareToken: typeof token === "string" && token.length > 0 ? token : null,
    }),
  folderTokens: {},
  setFolderToken: (folderId: string, token: string) =>
    set((state: AppState) => ({
      folderTokens: { ...state.folderTokens, [folderId]: token },
    })),
  currentFolderId: null,
  setCurrentFolderId: (id: string | null) =>
    set((state: AppState) => ({
      currentFolderId: id,
      navigatingId: state.navigatingId === id ? null : state.navigatingId,
    })),
  navigatingId: null,
  setNavigatingId: (id: string | null) => set({ navigatingId: id }),
  currentFileId: null,
  setCurrentFileId: (id: string | null) =>
    set((state: AppState) => ({
      currentFileId: id,
      navigatingId: state.navigatingId === id ? null : state.navigatingId,
    })),
  shareLinks: [],
  fetchShareLinks: async () => {
    try {
      const response = await fetch("/api/share/list");
      if (!response.ok) throw new Error("Failed to fetch share link list.");
      const links: ShareLink[] = await response.json();
      links.sort(
        (a, b) =>
          new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime(),
      );
      set({ shareLinks: links });
    } catch (error: any) {
      get().addToast({ message: error.message || "Error", type: "error" });
    }
  },
  addShareLink: (link: ShareLink) =>
    set((state: AppState) => {
      const updatedLinks = [...state.shareLinks, link];
      updatedLinks.sort(
        (a, b) =>
          new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime(),
      );
      return { shareLinks: updatedLinks };
    }),
  removeShareLink: async (linkToRemove: ShareLink) => {
    const originalLinks = get().shareLinks;
    set((state: AppState) => ({
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
    } catch (error: any) {
      get().addToast({ message: error.message || "Error", type: "error" });
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
  removeFileRequest: async (token: string) => {
    const original = get().fileRequests;
    set((state: AppState) => ({
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
    set((state: AppState) => ({
      dataUsage: { ...state.dataUsage, status: "loading" },
    }));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch("/api/datausage", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error("Failed to fetch usage data.");
      const data = await response.json();
      const formattedUsage = formatBytes(data.totalUsage);
      set({ dataUsage: { status: "success", value: formattedUsage } });
    } catch {
      clearTimeout(timeoutId);
      set((state: AppState) => ({
        dataUsage: {
          status: "error",
          value:
            state.dataUsage.value !== "Loading..."
              ? state.dataUsage.value
              : "Failed",
        },
      }));
    }
  },
  favorites: [],
  fetchFavorites: async () => {
    try {
      const response = await fetch("/api/favorites");
      if (!response.ok) return;
      const files: any[] = await response.json();
      set({ favorites: files.map((f: any) => f.id) });
    } catch (error) {
      console.error("Failed to fetch favorites:", error);
    }
  },
  toggleFavorite: async (fileId: string, isCurrentlyFavorite: boolean) => {
    const originalFavorites = get().favorites;
    const newFavorites = isCurrentlyFavorite
      ? originalFavorites.filter((id: string) => id !== fileId)
      : [...originalFavorites, fileId];
    set({ favorites: newFavorites });
    try {
      const response = await fetch("/api/favorites", {
        method: isCurrentlyFavorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to update favorites.");
      get().addToast({ message: result.message, type: "success" });
    } catch (error: any) {
      get().addToast({ message: error.message || "Error", type: "error" });
      set({ favorites: originalFavorites });
    }
  },
  detailsFile: null,
  setDetailsFile: (file: any | null) => set({ detailsFile: file }),
  fileTags: {},
  fetchTags: async (fileId: string) => {
    try {
      const response = await fetch(`/api/tags?fileId=${fileId}`);
      if (response.ok) {
        const data = await response.json();
        const tags = Array.isArray(data) ? data : data.tags || [];
        set((state: AppState) => ({
          fileTags: { ...state.fileTags, [fileId]: tags },
        }));
      }
    } catch (error) {
      console.error("Failed to fetch tags", error);
    }
  },
  addTag: async (fileId: string, tag: string) => {
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, tag, action: "add" }),
      });
      if (response.ok) {
        const currentTags = get().fileTags[fileId] || [];
        if (!currentTags.includes(tag)) {
          set((state: AppState) => ({
            fileTags: { ...state.fileTags, [fileId]: [...currentTags, tag] },
          }));
        }
      }
    } catch (error) {
      console.error("Failed to add tag", error);
    }
  },
  removeTag: async (fileId: string, tag: string) => {
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, tag, action: "remove" }),
      });
      if (response.ok) {
        set((state: AppState) => ({
          fileTags: {
            ...state.fileTags,
            [fileId]: (state.fileTags[fileId] || []).filter(
              (t: string) => t !== tag,
            ),
          },
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
      if (response.ok) set({ pinnedFolders: await response.json() });
    } catch (error) {
      console.error("Failed to fetch pinned folders", error);
    }
  },
  addPin: async (folderId: string) => {
    try {
      const response = await fetch("/api/pinned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (response.ok) {
        get().addToast({ message: "Folder pinned!", type: "success" });
        await get().fetchPinnedFolders();
      }
    } catch {
      get().addToast({ message: "Failed to pin folder", type: "error" });
    }
  },
  removePin: async (folderId: string) => {
    try {
      const response = await fetch("/api/pinned", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (response.ok) {
        get().addToast({ message: "Pin removed!", type: "success" });
        await get().fetchPinnedFolders();
      }
    } catch {
      get().addToast({ message: "Failed to remove pin", type: "error" });
    }
  },
  videoProgress: {},
  setVideoProgress: (fileId: string, time: number) =>
    set((state: AppState) => ({
      videoProgress: { ...state.videoProgress, [fileId]: time },
    })),
  uploads: {},
  updateUploadProgress: (
    fileName: string,
    progress: number,
    status: "uploading" | "success" | "error",
    error?: string,
  ) =>
    set((state: AppState) => ({
      uploads: {
        ...state.uploads,
        [fileName]: { name: fileName, progress, status, error },
      },
    })),
  removeUpload: (fileName: string) =>
    set((state: AppState) => {
      const newUploads = { ...state.uploads };
      delete newUploads[fileName];
      return { uploads: newUploads };
    }),
});
