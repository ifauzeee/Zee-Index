// File: lib/store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import { kv } from '@/lib/kv'; // <-- PERBAIKAN: Tambahkan baris ini

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
  shareLinks: ShareLink[];
  fetchShareLinks: () => Promise<void>;
  addShareLink: (link: ShareLink) => void;
  removeShareLink: (id: string) => Promise<void>;
}

const SHARE_LINKS_KEY = 'zee-index:share-links';

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
       currentFolderId: null,
      setCurrentFolderId: (id) => set({ currentFolderId: id }),
      
      shareLinks: [],
      fetchShareLinks: async () => {
        try {
            const response = await fetch('/api/share/list');
            if (!response.ok) throw new Error("Gagal mengambil daftar tautan");
            const links = await response.json();
            set({ shareLinks: links });
        } catch (error) {
            console.error(error);
            get().addToast({ message: 'Gagal sinkronisasi daftar tautan.', type: 'error' });
        }
      },
      addShareLink: (link) => set(state => ({ shareLinks: [...state.shareLinks, link] })),
      
      removeShareLink: async (id: string) => {
        const { addToast } = get();
        const linkToRemove = get().shareLinks.find(link => link.id === id);

        if (!linkToRemove) return;

        try {
          const revokeResponse = await fetch('/api/share/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               jti: linkToRemove.jti,
              expiresAt: linkToRemove.expiresAt,
            }),
          });
          if (!revokeResponse.ok) throw new Error('Gagal membatalkan tautan di server.');

          const currentLinks = get().shareLinks;
          const updatedLinks = currentLinks.filter(link => link.id !== id);
          await kv.set(SHARE_LINKS_KEY, updatedLinks);

          set({ shareLinks: updatedLinks });
          addToast({ message: 'Tautan berhasil dibatalkan dan dihapus.', type: 'success' });

        } catch (error: any) {
          console.error("Gagal menghapus tautan:", error);
          addToast({ message: error.message, type: 'error' });
        }
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ 
        theme: state.theme, 
        view: state.view, 
        sort: state.sort,
      }),
    }
  )
);