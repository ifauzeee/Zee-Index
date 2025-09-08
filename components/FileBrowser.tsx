// File: components/FileBrowser.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { jwtDecode } from 'jwt-decode';
import type { DriveFile } from '@/lib/googleDrive';
import { useAppStore } from '@/lib/store';
import Loading from '@/components/Loading';
import FileList from '@/components/FileList';
import AuthModal from './AuthModal';
import { List, Grid, CheckSquare, Share2, Upload, Loader2 } from 'lucide-react';
import ContextMenu from './ContextMenu';
import RenameModal from './RenameModal';
import DeleteConfirm from './DeleteConfirm';
import UploadModal from './UploadModal';
import MoveModal from './MoveModal';
import ShareButton from './ShareButton';

interface HistoryItem {
  id: string;
  name: string;
}

type ActionState = {
  type: 'rename' | 'delete' | 'share' | 'move' | 'copy' | null;
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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const {
    sort, isBulkMode, setBulkMode, toggleSelection,
    view, setView, refreshKey, addToast, triggerRefresh,
    folderTokens, setFolderToken, user,
    shareToken, setShareToken,
    setCurrentFolderId,
    favorites, fetchFavorites, toggleFavorite
  } = useAppStore();

  useEffect(() => {
    if (user) {
        fetchFavorites();
    }
  }, [user, fetchFavorites]);

  useEffect(() => {
    const currentShareToken = searchParams.get('share_token');

    if (currentShareToken) {
      setShareToken(currentShareToken);
      
      fetch('/api/share/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken: currentShareToken }),
      }).catch(err => console.error("Tracking failed:", err));

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
  
  useEffect(() => {
    if (!shareToken) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch('/api/share/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shareToken }),
        });

        const data = await response.json();

        if (!data.valid) {
          clearInterval(intervalId);
          addToast({ message: 'Akses untuk tautan ini telah dicabut.', type: 'error' });
          router.push('/login?error=ShareLinkRevoked');
        }
      } catch (error) {
        console.error("Gagal memeriksa status token:", error);
        clearInterval(intervalId);
      }
    }, 7000);

    return () => clearInterval(intervalId);
  }, [shareToken, router, addToast]);

  const currentFolderId = history.length > 0 ? history[history.length - 1]?.id : initialFolderId || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;

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
    setNextPageToken(null);
    try {
      const url = new URL(window.location.origin + '/api/files');
      url.searchParams.append('folderId', folderId);
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
      setFiles(data.files || []);
      setNextPageToken(data.nextPageToken || null);
    } catch (error) {
      addToast({ message: 'Terjadi kesalahan jaringan.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [folderTokens, handleFetchError, addToast, shareToken]);

  const fetchNextPage = useCallback(async () => {
    if (isFetchingNextPage || !nextPageToken || !currentFolderId) return;

    setIsFetchingNextPage(true);
    try {
      const url = new URL(window.location.origin + '/api/files');
      url.searchParams.append('folderId', currentFolderId);
      url.searchParams.append('pageToken', nextPageToken);
      if (shareToken) {
         url.searchParams.append('share_token', shareToken);
      }
      const headers = new Headers();
      const folderAuthToken = folderTokens[currentFolderId];
      if (folderAuthToken) {
         headers.append('Authorization', `Bearer ${folderAuthToken}`);
      }
      
      const response = await fetch(url.toString(), { headers });
      if (!response.ok) {
        throw new Error('Gagal memuat halaman berikutnya.');
      }
      const data = await response.json();
      setFiles((prevFiles: DriveFile[]) => [...prevFiles, ...(data.files || [])]);
      setNextPageToken(data.nextPageToken || null);
    } catch (error: any) {
      addToast({ message: error.message, type: 'error' });
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [isFetchingNextPage, nextPageToken, currentFolderId, folderTokens, shareToken, addToast]);
  
  const loaderRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && nextPageToken) {
        fetchNextPage();
      }
    });

    if (node) observerRef.current.observe(node);
  }, [isLoading, nextPageToken, fetchNextPage]);

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
    if (!user) return;
    setContextMenu({ x: event.clientX, y: event.clientY, file });
  }, [isBulkMode, shareToken, user]);
  
  const handleShare = (file: DriveFile | null) => {
    if (user?.role !== 'ADMIN') {
       addToast({ message: 'Fitur berbagi hanya untuk Admin.', type: 'error' });
      return;
    }
    setActionState({ type: 'share', file });
  };
  
  const handleToggleFavorite = () => {
    if (!contextMenu?.file) return;
    const { file } = contextMenu;
    const isCurrentlyFavorite = favorites.includes(file.id);
    toggleFavorite(file.id, isCurrentlyFavorite);
    setContextMenu(null);
  };

  const handleCopy = async () => {
    if (!contextMenu?.file) {
      setContextMenu(null);
      return;
    }
    const fileToCopy = contextMenu.file;
    setContextMenu(null);
    addToast({ message: `Menyalin "${fileToCopy.name}"...`, type: 'info' });

    try {
      const response = await fetch('/api/files/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: fileToCopy.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal membuat salinan.');

      addToast({ message: 'File berhasil disalin!', type: 'success' });
      triggerRefresh();
    } catch (err: any) {
      addToast({ message: err.message, type: 'error' });
    }
  };
  
  const handleRename = async (newName: string) => {
    if (!actionState.file || newName === actionState.file.name) {
       setActionState({ type: null, file: null }); return;
    }
    try {
        const response = await fetch('/api/files/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: actionState.file.id, newName }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal mengubah nama');
        setFiles((prevFiles: DriveFile[]) => prevFiles.map((f: DriveFile) => f.id === data.file.id ? { ...f, name: data.file.name } : f));
        addToast({ message: 'Nama berhasil diubah!', type: 'success' });
        setActionState({ type: null, file: null });
    } catch(err: any) { addToast({ message: err.message, type: 'error' }); }
  };

  const handleDelete = async () => {
    if (!actionState.file) return;
    try {
        const response = await fetch('/api/files/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: actionState.file.id }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal menghapus file');
        setFiles((prevFiles: DriveFile[]) => prevFiles.filter((f: DriveFile) => f.id !== actionState.file?.id));
        addToast({ message: 'File berhasil dihapus!', type: 'success' });
        setActionState({ type: null, file: null });
    } catch(err: any) { addToast({ message: err.message, type: 'error' }); }
  };

  const handleMove = async (newParentId: string) => {
    if (!actionState.file || !actionState.file.parents) {
      setActionState({ type: null, file: null });
      return;
    }
    const currentParentId = actionState.file.parents[0];
    try {
      const response = await fetch('/api/files/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: actionState.file.id, currentParentId, newParentId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memindahkan file');
      
      setFiles((prevFiles: DriveFile[]) => prevFiles.filter((f: DriveFile) => f.id !== actionState.file?.id));
      addToast({ message: 'File berhasil dipindahkan!', type: 'success' });
      setActionState({ type: null, file: null });
    } catch (err: any) {
      addToast({ message: err.message, type: 'error' });
    }
  };

  const sortedFiles = useMemo(() => {
    return [...files]
      .map(file => ({ ...file, isFavorite: favorites.includes(file.id) }))
      .sort((a, b) => {
        const isAsc = sort.order === 'asc' ? 1 : -1;
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        switch (sort.key) {
            case 'name': return a.name.localeCompare(b.name, 'id', { numeric: true }) * isAsc;
            case 'size': return (Number(a.size || 0) - Number(b.size || 0)) * isAsc;
            case 'modifiedTime': return (new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime()) * isAsc;
            default: return 0;
        }
    });
  }, [files, sort, favorites]);

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
            onMove={() => { setActionState({ type: 'move', file: contextMenu.file }); setContextMenu(null); }}
            isFavorite={favorites.includes(contextMenu.file.id)}
            onToggleFavorite={handleToggleFavorite}
            onCopy={handleCopy}
          />
        )}
        {actionState.type === 'rename' && actionState.file && (<RenameModal currentName={actionState.file.name} onClose={() => setActionState({ type: null, file: null })} onRename={handleRename}/>)}
        {actionState.type === 'delete' && actionState.file && (<DeleteConfirm itemName={actionState.file.name} onClose={() => setActionState({ type: null, file: null })} onConfirm={handleDelete}/>)}
        {actionState.type === 'share' && actionState.file && (<ShareButton path={getSharePath(actionState.file)} itemName={actionState.file.name} isOpen={true} onClose={() => setActionState({ type: null, file: null })}/>)}
        {actionState.type === 'move' && actionState.file && (<MoveModal fileToMove={actionState.file} onClose={() => setActionState({ type: null, file: null })} onConfirmMove={handleMove}/>)}
        {isUploadModalOpen && <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />}
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
                    onClick={() => setIsUploadModalOpen(true)}
                    className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-sm gap-2 text-foreground" 
                    title="Upload atau Buat Folder">
                    <Upload size={18} />
                </button>
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
        {isLoading ? (
          <Loading />
        ) : (
          <>
            <FileList files={sortedFiles} onItemClick={handleItemClick} onItemContextMenu={handleContextMenu} />
            
            <div ref={loaderRef} className="flex justify-center items-center p-4 h-20">
              {isFetchingNextPage && <Loader2 className="animate-spin text-primary" />}
              {!nextPageToken && files.length > 0 && <span className="text-sm text-muted-foreground">Akhir dari daftar</span>}
            </div>
          </>
        )}
      </main>
    </motion.div>
  );
}