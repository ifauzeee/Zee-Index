import { StateCreator } from "zustand";
import { AppState, AuthSlice } from "../types";

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (
  set,
) => ({
  isLocalStorageUnlocked: false,
  unlockLocalStorage: async (password: string) => {
    try {
      const response = await fetch("/api/auth/local/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        set({ isLocalStorageUnlocked: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
  lockLocalStorage: async () => {
    try {
      await fetch("/api/auth/local/logout", { method: "POST" });
      set({ isLocalStorageUnlocked: false });
      return true;
    } catch {
      return false;
    }
  },
  checkLocalStorageAuth: async () => {
    try {
      const response = await fetch("/api/auth/local/check");
      if (response.ok) {
        set({ isLocalStorageUnlocked: true });
      } else {
        set({ isLocalStorageUnlocked: false });
      }
    } catch {
      set({ isLocalStorageUnlocked: false });
    }
  },
  isGoogleAuthHealthy: true,
  googleAuthError: null,
  setGoogleAuthHealth: (isHealthy: boolean, error: string | null = null) => {
    set({ isGoogleAuthHealthy: isHealthy, googleAuthError: error });
  },
});
