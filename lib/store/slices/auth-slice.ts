import { StateCreator } from "zustand";
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
  fetchAdminEmails: async () => {
    set({ isFetchingAdmins: true });
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch admin list");
      const emails = await response.json();
      set({ adminEmails: emails });
    } catch (error: any) {
      get().addToast({
        message: error.message || "Error",
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
      if (!response.ok) throw new Error(result.error || "Failed to add admin.");
      set((state: AppState) => ({
        adminEmails: [...state.adminEmails, email].sort(),
      }));
      get().addToast({ message: result.message, type: "success" });
    } catch (error: any) {
      get().addToast({
        message: error.message || "Error",
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
    } catch (error: any) {
      get().addToast({
        message: error.message || "Error",
        type: "error",
      });
      set({ adminEmails: originalAdmins });
    }
  },
  editorEmails: [],
  isFetchingEditors: false,
  fetchEditorEmails: async () => {
    set({ isFetchingEditors: true });
    try {
      const response = await fetch("/api/admin/editors");
      if (!response.ok) throw new Error("Failed to fetch editor list");
      const emails = await response.json();
      set({ editorEmails: emails });
    } catch (error: any) {
      get().addToast({ message: error.message || "Error", type: "error" });
    } finally {
      set({ isFetchingEditors: false });
    }
  },
  addEditorEmail: async (email: string) => {
    try {
      const response = await fetch("/api/admin/editors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to add editor.");
      set((state: AppState) => ({
        editorEmails: [...state.editorEmails, email].sort(),
      }));
      get().addToast({ message: result.message, type: "success" });
    } catch (error: any) {
      get().addToast({ message: error.message || "Error", type: "error" });
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
    } catch (error: any) {
      get().addToast({ message: error.message || "Error", type: "error" });
      set({ editorEmails: originalEditors });
    }
  },
});
