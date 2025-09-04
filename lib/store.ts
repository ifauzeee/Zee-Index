// File: lib/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UserProfile {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

type ViewMode = 'list' | 'grid';
type SortKey = 'name' | 'size' | 'modifiedTime';
type SortOrder = 'asc' | 'desc';

interface AppState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  sort: { key: SortKey; order: SortOrder };
  setSort: (key: SortKey) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  isBulkMode: boolean;
  selectedFiles: string[];
  toggleSelection: (fileId: string) => void;
  setBulkMode: (isActive: boolean) => void;
  clearSelection: () => void;
  shareToken: string | null;
  setShareToken: (token: string | null) => void;
  folderTokens: Record<string, string>;
  setFolderToken: (folderId: string, token: string) => void;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  user: UserProfile | null;
  fetchUser: () => Promise<void>;
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      view: 'list',
      setView: (view) => set({ view }),
      sort: { key: 'name', order: 'asc' },
      setSort: (key) => {
        const currentSort = get().sort;
        const order = currentSort.key === key && currentSort.order === 'asc' ? 'desc' : 'asc';
        set({ sort: { key, order } });
      },
      refreshKey: 0,
      triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
      isBulkMode: false,
      selectedFiles: [],
      setBulkMode: (isActive) => {
        if (!isActive) {
           set({ isBulkMode: false, selectedFiles: [] });
        } else {
          set({ isBulkMode: true });
        }
      },
      toggleSelection: (fileId) => set((state) => {
        const newSelection = state.selectedFiles.includes(fileId)
          ? state.selectedFiles.filter(id => id !== fileId)
          : [...state.selectedFiles, fileId];
        return { selectedFiles: newSelection };
      }),
      clearSelection: () => set({ selectedFiles: [], isBulkMode: false }),
      shareToken: null,
      setShareToken: (token) => set({ shareToken: token }),
      folderTokens: {},
      setFolderToken: (folderId, token) => set((state) => ({
        folderTokens: {
          ...state.folderTokens,
           [folderId]: token,
        },
      })),
      toasts: [],
      addToast: (toastDetails) => {
         const id = new Date().toISOString() + Math.random();
        const newToast = { ...toastDetails, id };
        set((state) => ({ toasts: [...state.toasts, newToast] }));
        setTimeout(() => {
          get().removeToast(id);
        }, 5000);
      },
      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
      },
      user: null,
      fetchUser: async () => {
        try {
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const data = await response.json();
            set({ user: data.user });
          } else {
            set({ user: null });
          }
        } catch (error) {
          set({ user: null });
        }
      },
      // State dan fungsi baru untuk folder ID saat ini
      currentFolderId: null,
      setCurrentFolderId: (id) => set({ currentFolderId: id }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ theme: state.theme, view: state.view, sort: state.sort }),
    }
  )
);