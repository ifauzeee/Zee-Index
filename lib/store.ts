// File: lib/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DriveFile } from './googleDrive';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ShareLink {
    id: string;
    path: string;
    token: string;
    jti: string;
    expiresAt: string;
    loginRequired: boolean;
    itemName: string;
}

interface UserProfile {
  name?: string | null;
  email?: string | null;
  image?: string | null;
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
  shareLinks: ShareLink[];
  fetchShareLinks: () => Promise<void>;
  addShareLink: (link: ShareLink) => void;
  removeShareLink: (link: ShareLink) => Promise<void>;
  dataUsage: { status: 'idle' | 'loading' | 'success' | 'error'; value: string };
  fetchDataUsage: () => Promise<void>;
  adminEmails: string[];
  isFetchingAdmins: boolean;
  fetchAdminEmails: () => Promise<void>;
  addAdminEmail: (email: string) => Promise<void>;
  removeAdminEmail: (email: string) => Promise<void>;
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
      setShareToken: (token) => {
        set({ shareToken: typeof token === 'string' && token.length > 0 ? token : null });
      },
      folderTokens: {},
      setFolderToken: (folderId, token) => set((state) => ({
        folderTokens: { ...state.folderTokens, [folderId]: token },
      })),
      toasts: [],
      addToast: (toastDetails) => {
        const id = new Date().toISOString() + Math.random();
        const newToast = { ...toastDetails, id };
        set((state) => ({ toasts: [...state.toasts, newToast] }));
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
      currentFolderId: null,
      setCurrentFolderId: (id) => set({ currentFolderId: id }),
      shareLinks: [],
      fetchShareLinks: async () => { /* ... (fungsi tetap sama) ... */ },
      addShareLink: (link) => set(state => ({ shareLinks: [...state.shareLinks, link] })),
      removeShareLink: async (linkToRemove) => { /* ... (fungsi tetap sama) ... */ },
      dataUsage: { status: 'idle', value: 'Memuat...' },
      fetchDataUsage: async () => { /* ... (fungsi tetap sama) ... */ },

      // --- Implementasi logika Manajemen Admin ---
      adminEmails: [],
      isFetchingAdmins: false,
      fetchAdminEmails: async () => {
        set({ isFetchingAdmins: true });
        try {
          // PERBAIKAN: Path URL diubah
          const response = await fetch('/api/admin/users');
          if (!response.ok) throw new Error('Gagal mengambil daftar admin');
          const emails = await response.json();
          set({ adminEmails: emails });
        } catch (error: any) {
          get().addToast({ message: error.message, type: 'error' });
        } finally {
          set({ isFetchingAdmins: false });
        }
      },
      addAdminEmail: async (email: string) => {
        try {
          // PERBAIKAN: Path URL diubah
          const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Gagal menambahkan admin.');
          
          set(state => ({ adminEmails: [...state.adminEmails, email].sort() }));
          get().addToast({ message: result.message, type: 'success' });
        } catch (error: any) {
          get().addToast({ message: error.message, type: 'error' });
        }
      },
      removeAdminEmail: async (email: string) => {
        try {
          // PERBAIKAN: Path URL diubah
          const response = await fetch('/api/admin/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Gagal menghapus admin.');
          
          set(state => ({ adminEmails: state.adminEmails.filter(adminEmail => adminEmail !== email) }));
          get().addToast({ message: result.message, type: 'success' });
        } catch (error: any) {
          get().addToast({ message: error.message, type: 'error' });
        }
      },
    }),
    {
      name: 'zee-index-storage',
      partialize: (state) => ({ 
        theme: state.theme, 
        view: state.view, 
        sort: state.sort,
        folderTokens: state.folderTokens,
      }),
    }
  )
);