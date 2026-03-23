import { StateCreator } from "zustand";
import type { AppConfig } from "@/lib/app-config.shared";
import { getErrorMessage } from "@/lib/errors";
import { DEFAULT_APP_CONFIG } from "@/lib/app-config.shared";
import {
  AppState,
  ViewMode,
  DensityMode,
  Toast,
  NotificationItem,
  UISlice,
  SortKey,
} from "../types";

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (
  set,
  get,
) => ({
  view: "list",
  setView: (view: ViewMode) => set({ view }),
  density: "comfortable",
  setDensity: (density: DensityMode) => set({ density }),
  sort: { key: "name", order: "asc" },
  setSort: (key: SortKey) => {
    const currentSort = get().sort;
    const order =
      currentSort.key === key && currentSort.order === "asc" ? "desc" : "asc";
    set({ sort: { key, order } });
  },
  isSidebarOpen: true,
  toggleSidebar: () =>
    set((state: AppState) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen: boolean) => set({ isSidebarOpen: isOpen }),
  toasts: [],
  addToast: (toastDetails: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    const newToast = { ...toastDetails, id };
    const newNotification: NotificationItem = {
      id,
      message: toastDetails.message,
      type: toastDetails.type,
      timestamp: Date.now(),
      read: false,
    };
    set((state: AppState) => ({
      toasts: [...state.toasts, newToast],
      notifications: [newNotification, ...state.notifications].slice(0, 50),
    }));
  },
  removeToast: (id: string) =>
    set((state: AppState) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  notifications: [],
  addNotification: (notification: NotificationItem) =>
    set((state: AppState) => {
      if (state.notifications.some((n) => n.id === notification.id))
        return state;
      return {
        notifications: [notification, ...state.notifications].slice(0, 100),
      };
    }),
  isNotificationOpen: false,
  toggleNotificationCenter: () =>
    set((state: AppState) => ({
      isNotificationOpen: !state.isNotificationOpen,
    })),
  markAllNotificationsRead: () =>
    set((state: AppState) => ({
      notifications: state.notifications.map((n: NotificationItem) => ({
        ...n,
        read: true,
      })),
    })),
  clearNotifications: () => set({ notifications: [] }),
  appName: DEFAULT_APP_CONFIG.appName,
  logoUrl: DEFAULT_APP_CONFIG.logoUrl,
  faviconUrl: DEFAULT_APP_CONFIG.faviconUrl,
  primaryColor: DEFAULT_APP_CONFIG.primaryColor,
  isConfigLoading: false,
  hideAuthor: null,
  disableGuestLogin: null,
  fetchConfig: async () => {
    set({ isConfigLoading: true });
    try {
      const response = await fetch("/api/admin/config");
      if (!response.ok)
        throw new Error(`Failed to fetch config: ${response.status}`);
      const config: AppConfig = await response.json();
      set({
        hideAuthor: config.hideAuthor,
        disableGuestLogin: config.disableGuestLogin,
        appName: config.appName,
        logoUrl: config.logoUrl,
        faviconUrl: config.faviconUrl,
        primaryColor: config.primaryColor,
      });
    } catch (error) {
      console.error("Config fetch error:", error);
      set({
        hideAuthor: DEFAULT_APP_CONFIG.hideAuthor,
        disableGuestLogin: DEFAULT_APP_CONFIG.disableGuestLogin,
        appName: DEFAULT_APP_CONFIG.appName,
        logoUrl: DEFAULT_APP_CONFIG.logoUrl,
        faviconUrl: DEFAULT_APP_CONFIG.faviconUrl,
        primaryColor: DEFAULT_APP_CONFIG.primaryColor,
      });
    } finally {
      set({ isConfigLoading: false });
    }
  },
  setConfig: async (config: Partial<AppConfig>) => {
    try {
      const response = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Update failed: ${response.status}`);
      }
      const result = await response.json();
      set((state: AppState) => ({ ...state, ...result.config }));
    } catch (error: unknown) {
      get().addToast({
        message: getErrorMessage(error, "Error updating config"),
        type: "error",
      });
    }
  },
  isTheaterMode: false,
  toggleTheaterMode: () =>
    set((state: AppState) => ({ isTheaterMode: !state.isTheaterMode })),
});
