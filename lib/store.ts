// lib/store.ts
import { create } from 'zustand';

// Definisikan tipe untuk toast
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
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

  // --- BAGIAN BARU UNTUK TOAST ---
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ... (state lama Anda tidak berubah)
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  view: 'list',
  setView: (view) => { localStorage.setItem('view_preference', view); set({ view }); },
  sort: { key: 'name', order: 'asc' },
  setSort: (key) => { const currentSort = get().sort; const order = currentSort.key === key && currentSort.order === 'asc' ? 'desc' : 'asc'; localStorage.setItem('sort_key', key); localStorage.setItem('sort_order', order); set({ sort: { key, order } }); },
  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  isBulkMode: false,
  selectedFiles: [],
  setBulkMode: (isActive) => { if (!isActive) { set({ isBulkMode: false, selectedFiles: [] }); } else { set({ isBulkMode: true }); } },
  toggleSelection: (fileId) => set((state) => { const newSelection = state.selectedFiles.includes(fileId) ? state.selectedFiles.filter(id => id !== fileId) : [...state.selectedFiles, fileId]; return { selectedFiles: newSelection }; }),
  clearSelection: () => set({ selectedFiles: [], isBulkMode: false }),
  shareToken: null,
  setShareToken: (token) => set({ shareToken: token }),

  // --- FUNGSI BARU UNTUK TOAST ---
  toasts: [],
  addToast: (toastDetails) => {
    const id = new Date().toISOString();
    const newToast = { ...toastDetails, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    
    // Hapus toast secara otomatis setelah 5 detik
    setTimeout(() => {
      get().removeToast(id);
    }, 5000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));