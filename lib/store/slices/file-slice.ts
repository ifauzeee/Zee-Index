import { StateCreator } from "zustand";
import type { DriveFile } from "@/lib/drive";
import { AppState, FileSlice, ShareTokenPayload } from "../types";
import { shareTokenPayloadSchema } from "@/lib/link-payloads";

function parseJwt(token: string): ShareTokenPayload | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    const parsed = shareTokenPayloadSchema.safeParse(
      JSON.parse(jsonPayload) as unknown,
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const createFileSlice: StateCreator<AppState, [], [], FileSlice> = (
  set,
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
  toggleSelection: (file: DriveFile) =>
    set((state: AppState) => {
      const isSelected = state.selectedFiles.some((f) => f.id === file.id);
      const newSelection = isSelected
        ? state.selectedFiles.filter((f) => f.id !== file.id)
        : [...state.selectedFiles, file];
      return { selectedFiles: newSelection };
    }),
  setSelectedFiles: (files: DriveFile[]) => set({ selectedFiles: files }),
  clearSelection: () => set({ selectedFiles: [], isBulkMode: false }),
  shareToken: null,
  sharePolicy: null,
  setShareToken: (token: string | null) => {
    let policy = null;
    if (typeof token === "string" && token.length > 0) {
      const payload = parseJwt(token);
      if (payload) {
        policy = {
          preventDownload: payload.preventDownload,
          hasWatermark: payload.hasWatermark,
          watermarkText: payload.watermarkText,
        };
      }
    }
    set({
      shareToken: typeof token === "string" && token.length > 0 ? token : null,
      sharePolicy: policy,
    });
  },
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
  detailsFile: null,
  setDetailsFile: (file: DriveFile | null) => set({ detailsFile: file }),
  videoProgress: {},
  setVideoProgress: (fileId: string, time: number) =>
    set((state: AppState) => ({
      videoProgress: { ...state.videoProgress, [fileId]: time },
    })),
  uploads: {},
  updateUploadProgress: (
    fileName: string,
    parentId: string,
    progress: number,
    status: "uploading" | "success" | "error",
    error?: string,
  ) =>
    set((state: AppState) => ({
      uploads: {
        ...state.uploads,
        [fileName]: { name: fileName, parentId, progress, status, error },
      },
    })),
  removeUpload: (fileName: string) =>
    set((state: AppState) => {
      const newUploads = { ...state.uploads };
      delete newUploads[fileName];
      return { uploads: newUploads };
    }),
});
