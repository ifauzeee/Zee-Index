// File: components/FileBrowser.tsx

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { jwtDecode } from 'jwt-decode';
import type { DriveFile } from '@/lib/googleDrive';
import { useAppStore } from '@/lib/store';
import Loading from '@/components/Loading';
import FileList from '@/components/FileList';
import AuthModal from './AuthModal';
import { List, Grid, CheckSquare, Share2 } from 'lucide-react';
import ShareButton from './ShareButton';
import ContextMenu from './ContextMenu';
import RenameModal from './RenameModal';
import DeleteConfirm from './DeleteConfirm';

interface HistoryItem {
  id: string;
  name: string;
}

type ActionState = {
  type: 'rename' | 'delete' | 'share' | null;
  file: DriveFile | null;
};

export default function FileBrowser({ initialFolderId }: { initialFolderId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; folderId: string; folderName: string; }>({ isOpen: false, folderId: '', folderName: '' });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, file: DriveFile } | null>(null);
  const [actionState, setActionState] = useState<ActionState>({ type: null, file: null });

  const {
    sort, isBulkMode, setBulkMode, toggleSelection,
    view, setView, refreshKey, addToast,
    folderTokens, setFolderToken, user,
    shareToken, setShareToken,
    setCurrentFolderId
  } = useAppStore();

  useEffect(() => {
    const currentShareToken = searchParams.get('share_token');

    if (currentShareToken) {
      setShareToken(currentShareToken);
      try {
        const decodedToken: { exp: number } = jwtDecode(currentShareToken);
        const expirationTime = decodedToken.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiration = expirationTime - currentTime;

        if (timeUntilExpiration > 0) {
          const timer = setTimeout(() => {
            addToast({ message: 'Sesi berbagi Anda telah berakhir.', type: 'info' });
            setShareToken(null);
            router.push('/login?error=InvalidOrExpiredShareLink');
          }, timeUntilExpiration);

          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error("Token tidak valid:", error);
      }
    }
  }, [searchParams, router, addToast, setShareToken]);

  const currentFolderId = history.length > 0 ? history[history.length - 1]?.id : initialFolderId || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;

  // Perbaikan: useEffect ini akan memastikan currentFolderId di store selalu up-to-date
  useEffect(() => {
    setCurrentFolderId(currentFolderId);
  }, [currentFolderId, setCurrentFolderId]);

  const createSlug = (name: string) => encodeURIComponent(name.replace(/\s+/g, '-').toLowerCase());

  const handleFetchError = useCallback(async (response: Response, defaultMessage: string, folderId: string, folderName: string) => {
    const errorData = await response.json();
    if (response.status === 401) {
      if (errorData.protected) {
        setAuthModal({ isOpen: true, folderId, folderName });
      } else {
        addToast({ message: 'Sesi Anda telah berakhir. Silakan login kembali.', type: 'error' });
        router.push('/login?error=SessionExpired');
      }
    } else {
      addToast({ message: errorData.error || defaultMessage, type: 'error' });
    }
    setIsLoading(false);
  }, [addToast, router]);

  const fetchFiles = useCallback(async (folderId: string, folderName: string) => {
    setIsLoading(true);
    setFiles([]);
    let allFiles: DriveFile[] = [];
    let pageToken: string | null = null;
    try {
      do {
        const url = new URL(window.location.origin + '/api/files');
        url.searchParams.append('folderId', folderId);
        if (pageToken) url.searchParams.append('pageToken', pageToken);
        
        if (shareToken) {
           url.searchParams.append('share_token', shareToken);
        }
    
        const headers = new Headers();
        const folderAuthToken = folderTokens[folderId];
        if (folderAuthToken) {
           headers.append('Authorization', `Bearer ${folderAuthToken}`);
        }
        
        const response = await fetch(url.toString(), { headers });
      
        if (!response.ok) {
           await handleFetchError(response, 'Gagal mengambil data file.', folderId, folderName);
           return;
        }
        const data = await response.json();
        if (data.files) allFiles = [...allFiles, ...data.files];
        pageToken = data.nextPageToken || null;
      } while (pageToken);
      setFiles(allFiles);
    } catch (error) {
      addToast({ message: 'Terjadi kesalahan jaringan.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [folderTokens, handleFetchError, addToast, shareToken]);

  const handleItemClick = (file: DriveFile) => {
    if (isBulkMode) {
      toggleSelection(file.id);
      return;
    }
    
    if (file.isFolder && file.isProtected && !folderTokens[file.id]) {
      setAuthModal({ isOpen: true, folderId: file.id, folderName: file.name });
      return;
    }

    let destinationUrl = file.isFolder
      ? `/folder/${file.id}`
      : `/folder/${currentFolderId}/file/${file.id}/${createSlug(file.name)}`;

    if (shareToken) {
      destinationUrl += `?share_token=${shareToken}`;
    }

    router.push(destinationUrl);
  };
  
  const handleAuthSubmit = async (id: string, password: string) => {
    setIsAuthLoading(true);
    try {
        const response = await fetch('/api/auth/folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderId: authModal.folderId, id, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Kredensial salah.');
        
        setFolderToken(authModal.folderId, data.token);
        addToast({ message: 'Akses diberikan!', type: 'success' });
        
        const targetFolderId = authModal.folderId;
        setAuthModal({ isOpen: false, folderId: '', folderName: '' });
        router.push(`/folder/${targetFolderId}`);

    } catch (err: any) {
        addToast({ message: err.message, type: 'error' });
    } finally {
        setIsAuthLoading(false);
    }
  };

  const handleBreadcrumbClick = (folderId: string) => {
    if (shareToken && folderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID) {
        addToast({ message: 'Akses dibatasi hanya untuk folder yang dibagikan.', type: 'info' });
        return;
    }

    let folderUrl = folderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID ? '/' : `/folder/${folderId}`;
    if (shareToken) {
        folderUrl += `?share_token=${shareToken}`;
    }
    router.push(folderUrl);
  };

  useEffect(() => {
    const currentFolder = history[history.length - 1];
    if (currentFolder) {
      fetchFiles(currentFolder.id, currentFolder.name);
    }
  }, [history, refreshKey, fetchFiles]);
  
  useEffect(() => {
    const rootFolder = { id: process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!, name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || 'Beranda' };
    
    const initializeHistory = async () => {
      if (shareToken && (!initialFolderId || initialFolderId === rootFolder.id)) {
        router.push('/login?error=RootAccessDenied');
        return;
      }

      if (!initialFolderId || initialFolderId === rootFolder.id) {
         if(history.length > 1 || history[0]?.id !== rootFolder.id) setHistory([rootFolder]);
      } else {
        const currentHistoryId = history[history.length - 1]?.id;
        if (currentHistoryId !== initialFolderId) {
          try {
            setIsLoading(true);
            const url = new URL(`/api/folderpath`, window.location.origin);
            url.searchParams.set('folderId', initialFolderId);
            
            const response = await fetch(url.toString());
        
            if (!response.ok) {
              addToast({ message: "Gagal memuat path, kembali ke Beranda.", type: 'error' });
              router.push('/');
              return;
            }
            const path = await response.json();
            setHistory([rootFolder, ...path]);
          } catch (error) {
            addToast({ message: "Gagal memuat path folder.", type: 'error' });
            router.push('/');
          }
        }
      }
    };
    initializeHistory();
  }, [initialFolderId, addToast, router, history, shareToken]);
  
  const handleContextMenu = useCallback((event: React.MouseEvent, file: DriveFile) => {
    event.preventDefault();
    if (isBulkMode || shareToken) return;
    setContextMenu({ x: event.clientX, y: event.clientY, file });
  }, [isBulkMode, shareToken]);
  
  const handleShare = (file: DriveFile | null) => {
    if (user?.role !== 'ADMIN') {
       addToast({ message: 'Fitur berbagi hanya untuk Admin.', type: 'error' });
      return;
    }
    setActionState({ type: 'share', file });
  };
  
  const handleRename = async (newName: string) => {
    if (!actionState.file || newName === actionState.file.name) {
       setActionState({ type: null, file: null }); return;
    }
    try {
        const response = await fetch('/api/files/rename', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-role': user?.role || 'USER' }, body: JSON.stringify({ fileId: actionState.file.id, newName }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal mengubah nama');
        setFiles(prevFiles => prevFiles.map(f => f.id === data.file.id ? { ...f, name: data.file.name } : f));
        addToast({ message: 'Nama berhasil diubah!', type: 'success' });
        setActionState({ type: null, file: null });
    } catch(err: any) { addToast({ message: err.message, type: 'error' }); }
  };

  const handleDelete = async () => {
    if (!actionState.file) return;
    try {
        const response = await fetch('/api/files/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-role': user?.role || 'USER' }, body: JSON.stringify({ fileId: actionState.file.id }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal menghapus file');
        setFiles(prevFiles => prevFiles.filter(f => f.id !== actionState.file?.id));
        addToast({ message: 'File berhasil dihapus!', type: 'success' });
        setActionState({ type: null, file: null });
    } catch(err: any) { addToast({ message: err.message, type: 'error' }); }
  };

  const sortedFiles = [...files].sort((a, b) => {
      const isAsc = sort.order === 'asc' ? 1 : -1;
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      switch (sort.key) {
          case 'name': return a.name.localeCompare(b.name, 'id', { numeric: true }) * isAsc;
          case 'size': return (Number(a.size || 0) - Number(b.size || 0)) * isAsc;
          case 'modifiedTime': return (new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime()) * isAsc;
          default: return 0;
      }
  });

  const getSharePath = (file: DriveFile) => {
    if (file.isFolder) return `/folder/${file.id}`;
    return `/folder/${currentFolderId}/file/${file.id}/${createSlug(file.name)}`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <AnimatePresence>
        {authModal.isOpen && (<AuthModal folderName={authModal.folderName} isLoading={isAuthLoading} onClose={() => setAuthModal({ isOpen: false, folderId: '', folderName: '' })} onSubmit={handleAuthSubmit}/>)}
        {contextMenu && (
          <ContextMenu 
            x={contextMenu.x} y={contextMenu.y} 
            onClose={() => setContextMenu(null)} 
            onRename={() => { setActionState({ type: 'rename', file: contextMenu.file }); setContextMenu(null); }} 
            onDelete={() => { setActionState({ type: 'delete', file: contextMenu.file }); setContextMenu(null); }} 
            onShare={() => { handleShare(contextMenu.file); setContextMenu(null); }}
          />
        )}
        {actionState.type === 'rename' && actionState.file && (<RenameModal currentName={actionState.file.name} onClose={() => setActionState({ type: null, file: null })} onRename={handleRename}/>)}
        {actionState.type === 'delete' && actionState.file && (<DeleteConfirm itemName={actionState.file.name} onClose={() => setActionState({ type: null, file: null })} onConfirm={handleDelete}/>)}
        {actionState.type === 'share' && actionState.file && (<ShareButton path={getSharePath(actionState.file)} itemName={actionState.file.name} isOpen={true} onClose={() => setActionState({ type: null, file: null })}/>)}
      </AnimatePresence>
      <div className="flex justify-between items-center py-4 overflow-x-hidden">
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap">
          {history.map((folder, index) => (
            <span key={folder.id} className="flex items-center">
              <button 
                onClick={() => handleBreadcrumbClick(folder.id)} 
                className={`transition-colors ${shareToken && index === 0 ? 'cursor-default text-muted-foreground' : 'hover:text-primary'}`}
              >
                {folder.name}
              </button>
              {index < history.length - 1 && <span className="mx-2">/</span>}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-2 shrink-0">
            {!shareToken && user?.role === 'ADMIN' && (
              <>
                <button 
                  onClick={() => handleShare({ id: currentFolderId, name: history[history.length - 1]?.name || 'Folder', isFolder: true, mimeType: '', modifiedTime: '', createdTime: '', hasThumbnail: false, webViewLink: '' })} 
                  className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-sm gap-2 text-foreground" 
                  title="Bagikan Folder Ini">
                  <Share2 size={18} />
                </button>
                <button onClick={() => setBulkMode(!isBulkMode)} className={`p-2 rounded-lg transition-colors flex items-center justify-center text-sm ${isBulkMode ? 'bg-blue-600 text-white' : 'bg-transparent hover:bg-accent text-foreground'}`} title="Pilih Beberapa File"><CheckSquare size={18} /><span className="sr-only">Pilih</span></button>
              </>
            )}
            <div className="flex items-center border border-border rounded-lg p-0.5">
              <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-background text-primary shadow-sm' : 'hover:bg-accent/50 text-muted-foreground'}`} title="Tampilan Daftar"><List size={18} /></button>
              <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-background text-primary shadow-sm' : 'hover:bg-accent/50 text-muted-foreground'}`} title="Tampilan Grid"><Grid size={18} /></button>
            </div>
        </div>
      </div>
      <main className="min-h-[50vh] mb-12">
        {isLoading ? <Loading /> : <FileList files={sortedFiles} onItemClick={handleItemClick} onItemContextMenu={handleContextMenu} />}
      </main>
    </motion.div>
  );
}