import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppState } from "./types";
import { createUISlice } from "./slices/ui-slice";
import { createAuthSlice } from "./slices/auth-slice";
import { createFileSlice } from "./slices/file-slice";
import { createAudioSlice } from "./slices/audio-slice";
import type { DriveFile } from "@/lib/drive";

export * from "./types";

const slimAudioFile = (file: DriveFile) => ({
  id: file.id,
  name: file.name,
  mimeType: file.mimeType,
  size: file.size,
  parents: file.parents,
  webViewLink: file.webViewLink,
});

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createUISlice(...a),
      ...createAuthSlice(...a),
      ...createFileSlice(...a),
      ...createAudioSlice(...a),
    }),
    {
      name: "zee-index-storage",
      partialize: (state) => ({
        view: state.view,
        density: state.density,
        sort: state.sort,
        notifications: state.notifications,
        isSidebarOpen: state.isSidebarOpen,
        audioQueue: state.audioQueue.map(slimAudioFile),
        activeAudioFile: state.activeAudioFile
          ? slimAudioFile(state.activeAudioFile)
          : null,
        videoProgress: state.videoProgress,
        folderTokens: state.folderTokens,
        sharePolicy: state.sharePolicy,
      }),
    },
  ),
);
