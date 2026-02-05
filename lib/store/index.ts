import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppState } from "./types";
import { createUISlice } from "./slices/ui-slice";
import { createAuthSlice } from "./slices/auth-slice";
import { createFileSlice } from "./slices/file-slice";
import { createAudioSlice } from "./slices/audio-slice";

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
        audioQueue: state.audioQueue,
        activeAudioFile: state.activeAudioFile,
        appName: state.appName,
        logoUrl: state.logoUrl,
        faviconUrl: state.faviconUrl,
        primaryColor: state.primaryColor,
        videoProgress: state.videoProgress,
        folderTokens: state.folderTokens,
      }),
    },
  ),
);
