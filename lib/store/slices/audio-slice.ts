import { StateCreator } from "zustand";
import type { DriveFile } from "@/lib/drive";
import { AppState, AudioSlice } from "../types";

export const createAudioSlice: StateCreator<AppState, [], [], AudioSlice> = (
  set,
  get,
) => ({
  activeAudioFile: null,
  audioQueue: [],
  isAudioPlaying: false,
  playAudio: (file: DriveFile, queue: DriveFile[] = []) =>
    set({
      activeAudioFile: file,
      isAudioPlaying: true,
      audioQueue: queue.length > 0 ? queue : [file],
    }),
  addToQueue: (files: DriveFile[]) =>
    set((state: AppState) => {
      const newFiles = files.filter(
        (file) =>
          !state.audioQueue.find((queuedFile) => queuedFile.id === file.id),
      );
      return { audioQueue: [...state.audioQueue, ...newFiles] };
    }),
  removeFromQueue: (fileId: string) =>
    set((state: AppState) => ({
      audioQueue: state.audioQueue.filter((file) => file.id !== fileId),
    })),
  playNextTrack: () => {
    const { activeAudioFile, audioQueue } = get();
    if (!activeAudioFile || audioQueue.length === 0) return;
    const currentIndex = audioQueue.findIndex(
      (file) => file.id === activeAudioFile.id,
    );
    if (currentIndex < audioQueue.length - 1) {
      set({ activeAudioFile: audioQueue[currentIndex + 1] });
    }
  },
  playPrevTrack: () => {
    const { activeAudioFile, audioQueue } = get();
    if (!activeAudioFile || audioQueue.length === 0) return;
    const currentIndex = audioQueue.findIndex(
      (file) => file.id === activeAudioFile.id,
    );
    if (currentIndex > 0) {
      set({ activeAudioFile: audioQueue[currentIndex - 1] });
    }
  },
  toggleAudioPlay: () =>
    set((state: AppState) => ({ isAudioPlaying: !state.isAudioPlaying })),
  closeAudio: () =>
    set({ activeAudioFile: null, isAudioPlaying: false, audioQueue: [] }),
});
