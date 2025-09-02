// components/FileBrowser.tsx
"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { DriveFile } from '@/lib/googleDrive';
import { useAppStore } from '@/lib/store';
import Loading from '@/components/Loading';
import FileList from '@/components/FileList';
import Cookies from 'js-cookie';
import { List, Grid, CheckSquare, Share2 } from 'lucide-react';
import ShareButton from './ShareButton';

interface HistoryItem { 
  id: string; 
  name: string;
}

export default function FileBrowser({ initialFolderId }: { initialFolderId?: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { 
    sort, isBulkMode, setBulkMode, toggleSelection,
    view, setView, refreshKey, shareToken, addToast 
  } = useAppStore();
  const currentFolderId = history.length > 0 ? history[history.length - 1]?.id : initialFolderId || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;
  const createSlug = (name: string) => encodeURIComponent(name.replace(/\s+/g, '-').toLowerCase());

  const handleFetchError = useCallback(async (response: Response, defaultMessage: string) => {
    if (response.status === 403) {
      addToast({
        message: 'Akses ditolak. Anda hanya dapat melihat file/folder yang dibagikan.',
        type: 'error',
      });
      if(history.length > 1) router.back();
    } else {
      const errorData = await response.json();
      addToast({ message: errorData.error || defaultMessage, type: 'error' });
    }
  }, [addToast, router, history.length]);
  
  const fetchFiles = useCallback(async (folderId: string, pToken: string | null = null) => {
    if (pToken) { 
      setIsLoadingMore(true); 
    } else { 
      setIsLoading(true); 
      setFiles([]); 
    }
    try {
      const url = new URL(window.location.origin + '/api/files');
      url.searchParams.append('folderId', folderId);
      if (pToken) url.searchParams.append('pageToken', pToken);
      if (shareToken) url.searchParams.set('share_token', shareToken);

      const response = await fetch(url.toString());
      if (!response.ok) {
        await handleFetchError(response, 'Gagal mengambil data file.');
        return;
      }
      const data = await response.json();
      setFiles(prev => pToken ? [...prev, ...(data.files || [])] : (data.files || []));
      setNextPageToken(data.nextPageToken || null);
    } catch (error) {
      addToast({ message: 'Terjadi kesalahan jaringan.', type: 'error' });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [shareToken, handleFetchError]);

  const handleLoadMore = () => { 
    if (nextPageToken) { 
      fetchFiles(currentFolderId, nextPageToken);
    } 
  };

  const handleItemClick = (file: DriveFile) => { 
    if (isBulkMode) { 
      toggleSelection(file.id);
      return; 
    } 
    if (file.isFolder) { 
      const newPath = { id: file.id, name: file.name };
      setHistory(prev => [...prev, newPath]); 
      const folderUrl = `/folder/${file.id}`;
      const urlWithToken = shareToken ? `${folderUrl}?share_token=${shareToken}` : folderUrl;
      router.push(urlWithToken); 
    } else { 
      const fileUrl = `/folder/${currentFolderId}/file/${file.id}/${createSlug(file.name)}`;
      const urlWithToken = shareToken ? `${fileUrl}?share_token=${shareToken}` : fileUrl;
      router.push(urlWithToken); 
    } 
  };

  const handleBreadcrumbClick = (folderId: string, index: number) => { 
    const newHistory = history.slice(0, index + 1);
    setHistory(newHistory); 
    const folderUrl = folderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID ? '/' : `/folder/${folderId}`;
    const urlWithToken = shareToken ? `${folderUrl}?share_token=${shareToken}` : folderUrl;
    router.push(urlWithToken); 
  };
  
  useEffect(() => { 
    if (currentFolderId) { 
      fetchFiles(currentFolderId); 
    } 
  }, [currentFolderId, refreshKey, fetchFiles]);

  useEffect(() => {
    const savedView = localStorage.getItem('view_preference') as 'list' | 'grid' | null;
    if (savedView) setView(savedView);
    
    const rootFolder = { id: process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!, name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || 'Beranda' };
    const initializeHistory = async () => {
        if (!initialFolderId || initialFolderId === rootFolder.id) {
            setHistory([rootFolder]);
        } else {
            try {
                const url = new URL(`/api/folderpath`, window.location.origin);
                url.searchParams.set('folderId', initialFolderId);
                if (shareToken) url.searchParams.set('share_token', shareToken);
                
                const response = await fetch(url.toString());
                if (!response.ok) {
                    await handleFetchError(response, 'Tidak dapat menemukan path folder.');
                    setHistory([rootFolder]);
                    router.push('/');
                    return;
                }
                const path = await response.json();
                setHistory([rootFolder, ...path]);
            } catch (error) {
                addToast({ message: "Terjadi kesalahan jaringan saat mengambil path.", type: 'error' });
                setHistory([rootFolder]);
                router.push('/');
            }
        }
    };
    initializeHistory();
  }, [initialFolderId, router, setView, shareToken, handleFetchError]);

  const sortedFiles = [...files].sort((a, b) => {
      const isAsc = sort.order === 'asc' ? 1 : -1;
      
      if (a.isFolder !== b.isFolder) {
          return a.isFolder ? -1 : 1;
      }
      
      switch (sort.key) {
          case 'name':
              return a.name.localeCompare(b.name, 'id', { numeric: true }) * isAsc;
          case 'size':
              return (Number(a.size || 0) - Number(b.size || 0)) * isAsc;
          case 'modifiedTime':
              return (new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime()) * isAsc;
          default:
              return 0;
      }
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex justify-between items-center py-4 overflow-x-hidden">
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap">
          {history.map((folder, index) => (
            <span key={folder.id} className="flex items-center">
              <button onClick={() => handleBreadcrumbClick(folder.id, index)} className="hover:text-primary transition-colors">{folder.name}</button>
              {index < history.length - 1 && <span className="mx-2">/</span>}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
            {currentFolderId !== process.env.NEXT_PUBLIC_ROOT_FOLDER_ID && !shareToken && (
                <ShareButton 
                    path={`/folder/${currentFolderId}`} 
                    itemName={history[history.length - 1]?.name || 'Folder'} 
                />
            )}
            
            <button
                onClick={() => setBulkMode(!isBulkMode)}
                className={`p-2 rounded-lg transition-colors flex items-center justify-center text-sm ${
                  isBulkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-transparent hover:bg-accent text-foreground'
                }`}
                title="Pilih Beberapa File"
            >
                <CheckSquare size={18} />
                <span className="sr-only">Pilih</span>
            </button>
            
            <div className="flex items-center border border-border rounded-lg p-0.5">
              <button 
                onClick={() => setView('list')} 
                className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-background text-primary shadow-sm' : 'hover:bg-accent/50 text-muted-foreground'}`} 
                title="Tampilan Daftar"
              >
                <List size={18} />
              </button>
              <button 
                onClick={() => setView('grid')} 
                className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-background text-primary shadow-sm' : 'hover:bg-accent/50 text-muted-foreground'}`} 
                title="Tampilan Grid"
              >
                <Grid size={18} />
              </button>
            </div>
        </div>
      </div>
      
      <main className="min-h-[50vh] mb-12">
        {isLoading ? <Loading /> : <FileList files={sortedFiles} onItemClick={handleItemClick} />}
        {!isLoading && nextPageToken && (
          <div className="text-center mt-8">
            <button 
              onClick={handleLoadMore} 
              disabled={isLoadingMore}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:bg-primary/50"
            >
              {isLoadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
            </button>
          </div>
        )}
      </main>
    </motion.div>
  );
}