import { StateCreator } from "zustand";
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
    const currentToasts = get().toasts;
    const isDuplicate = currentToasts.some(
      (t) => t.message === toastDetails.message && t.type === toastDetails.type,
    );

    if (isDuplicate) return;

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
  isTheaterMode: false,
  toggleTheaterMode: () =>
    set((state: AppState) => ({ isTheaterMode: !state.isTheaterMode })),
});
