import { StateCreator } from "zustand";
import { getErrorMessage } from "@/lib/errors";
import { AppState, AuthSlice } from "../types";

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (
  set,
  get,
) => ({
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
  adminEmails: [],
  isFetchingAdmins: false,
  fetchAdminEmails: async (isBackground = false) => {
    if (!isBackground) set({ isFetchingAdmins: true });
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch admin list");
      const emails = await response.json();
      set({ adminEmails: emails });
    } catch (error: unknown) {
      get().addToast({
        message: getErrorMessage(error, "Error"),
        type: "error",
      });
    } finally {
      if (!isBackground) set({ isFetchingAdmins: false });
    }
  },
  addAdminEmail: async (email: string) => {
    const originalAdmins = get().adminEmails;
    if (!originalAdmins.includes(email)) {
      set((state: AppState) => ({
        adminEmails: [...state.adminEmails, email].sort(),
      }));
    }
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to add admin.");
      get().addToast({ message: result.message, type: "success" });
      get().fetchAdminEmails(true);
    } catch (error: unknown) {
      set({ adminEmails: originalAdmins });
      get().addToast({
        message: getErrorMessage(error, "Error"),
        type: "error",
      });
    }
  },
  removeAdminEmail: async (email: string) => {
    const originalAdmins = get().adminEmails;
    set((state: AppState) => ({
      adminEmails: state.adminEmails.filter(
        (adminEmail: string) => adminEmail !== email,
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
      get().fetchAdminEmails(true);
    } catch (error: unknown) {
      get().addToast({
        message: getErrorMessage(error, "Error"),
        type: "error",
      });
      set({ adminEmails: originalAdmins });
    }
  },
  editorEmails: [],
  isFetchingEditors: false,
  fetchEditorEmails: async (isBackground = false) => {
    if (!isBackground) set({ isFetchingEditors: true });
    try {
      const response = await fetch("/api/admin/editors");
      if (!response.ok) throw new Error("Failed to fetch editor list");
      const emails = await response.json();
      set({ editorEmails: emails });
    } catch (error: unknown) {
      get().addToast({
        message: getErrorMessage(error, "Error"),
        type: "error",
      });
    } finally {
      if (!isBackground) set({ isFetchingEditors: false });
    }
  },
  addEditorEmail: async (email: string) => {
    const originalEditors = get().editorEmails;
    if (!originalEditors.includes(email)) {
      set((state: AppState) => ({
        editorEmails: [...state.editorEmails, email].sort(),
      }));
    }
    try {
      const response = await fetch("/api/admin/editors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to add editor.");
      get().addToast({ message: result.message, type: "success" });
      get().fetchEditorEmails(true);
    } catch (error: unknown) {
      set({ editorEmails: originalEditors });
      get().addToast({
        message: getErrorMessage(error, "Error"),
        type: "error",
      });
    }
  },
  removeEditorEmail: async (email: string) => {
    const originalEditors = get().editorEmails;
    set((state: AppState) => ({
      editorEmails: state.editorEmails.filter((e: string) => e !== email),
    }));
    try {
      const response = await fetch("/api/admin/editors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to remove editor.");
      get().addToast({ message: result.message, type: "success" });
      get().fetchEditorEmails(true);
    } catch (error: unknown) {
      get().addToast({
        message: getErrorMessage(error, "Error"),
        type: "error",
      });
      set({ editorEmails: originalEditors });
    }
  },
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
