// File: components/Search.tsx
"use client";

import { useState, useEffect, KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search as SearchIcon, X } from 'lucide-react';
// --- PERBAIKAN --- Impor useAppStore untuk akses state global
import { useAppStore } from '@/lib/store';

export default function Search({ onSearchClose }: { onSearchClose?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUrlQuery = searchParams.get('q');
  const [inputValue, setInputValue] = useState(currentUrlQuery || '');
  
  // --- PERBAIKAN --- Ambil state yang dibutuhkan dari store
  const { shareToken, currentFolderId } = useAppStore();

  useEffect(() => {
    if (currentUrlQuery !== inputValue) {
      setInputValue(currentUrlQuery || '');
    }
  }, [currentUrlQuery]);

  const performSearch = () => {
    // --- PERBAIKAN --- Bangun URL dengan logika baru
    let searchUrl = `/search?q=${encodeURIComponent(inputValue)}`;
    if (shareToken && currentFolderId) {
      // Jika ada share token, tambahkan folderId untuk membatasi pencarian
      searchUrl += `&folderId=${currentFolderId}`;
    }
    router.push(searchUrl);
  };
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue && inputValue !== currentUrlQuery) {
        performSearch();
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, currentUrlQuery, router, shareToken, currentFolderId]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      performSearch();
    }
  };
  
  const clearSearch = () => {
    setInputValue('');
    if (currentUrlQuery) {
        let homeUrl = '/';
        if (shareToken && currentFolderId) {
            homeUrl = `/folder/${currentFolderId}?share_token=${shareToken}`;
        }
        router.push(homeUrl);
    }
    if (onSearchClose) {
      onSearchClose();
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Cari di folder ini..."
        className="w-full pl-10 pr-10 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-ring focus:outline-none"
      />
      {inputValue && (
        <button
          onClick={clearSearch}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}