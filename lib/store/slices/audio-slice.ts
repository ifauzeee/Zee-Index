import { StateCreator } from "zustand";
import { AppState, AudioSlice } from "../types";

export const createAudioSlice: StateCreator<AppState, [], [], AudioSlice> = (
  set,
  get,
) => ({
  activeAudioFile: null,
  audioQueue: [],
  isAudioPlaying: false,
  playAudio: (file: any, queue: any[] = []) =>
    set({
      activeAudioFile: file,
      isAudioPlaying: true,
      audioQueue: queue.length > 0 ? queue : [file],
    }),
  addToQueue: (files: any[]) =>
    set((state: AppState) => {
      const newFiles = files.filter(
        (f: any) => !state.audioQueue.find((q: any) => q.id === f.id),
      );
      return { audioQueue: [...state.audioQueue, ...newFiles] };
    }),
  removeFromQueue: (fileId: string) =>
    set((state: AppState) => ({
      audioQueue: state.audioQueue.filter((f: any) => f.id !== fileId),
    })),
  playNextTrack: () => {
    const { activeAudioFile, audioQueue } = get();
    if (!activeAudioFile || audioQueue.length === 0) return;
    const currentIndex = audioQueue.findIndex(
      (f: any) => f.id === activeAudioFile.id,
    );
    if (currentIndex < audioQueue.length - 1) {
      set({ activeAudioFile: audioQueue[currentIndex + 1] });
    }
  },
  playPrevTrack: () => {
    const { activeAudioFile, audioQueue } = get();
    if (!activeAudioFile || audioQueue.length === 0) return;
    const currentIndex = audioQueue.findIndex(
      (f: any) => f.id === activeAudioFile.id,
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
