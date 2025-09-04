// File: components/Search.tsx
"use client";

import { useState, useEffect, KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search as SearchIcon, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function Search({ onSearchClose }: { onSearchClose?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUrlQuery = searchParams.get('q');
  const [inputValue, setInputValue] = useState(currentUrlQuery || '');
  
  // Ambil shareToken dan addToast dari store
  const { shareToken, currentFolderId, addToast } = useAppStore();

  useEffect(() => {
    if (currentUrlQuery !== inputValue) {
      setInputValue(currentUrlQuery || '');
    }
  }, [currentUrlQuery, inputValue]);

  // Perbaikan utama: Menggunakan fungsi terpisah untuk menangani logika pencarian.
  const handleSearch = () => {
    // Jika ada shareToken dan input tidak kosong, tampilkan notifikasi.
    if (shareToken) {
      addToast({ 
        message: 'Akses dibatasi. Tidak bisa menggunakan fitur pencarian.', 
        type: 'info' 
      });
      return; // Berhenti di sini, tidak melanjutkan pencarian.
    }

    // Jika tidak ada shareToken, lanjutkan dengan pencarian normal.
    if (inputValue) {
      let searchUrl = `/search?q=${encodeURIComponent(inputValue)}`;
      if (currentFolderId) {
        searchUrl += `&folderId=${currentFolderId}`;
      }
      router.push(searchUrl);
    }
  };
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue && inputValue !== currentUrlQuery) {
        handleSearch();
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, currentUrlQuery, handleSearch]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(); // Panggil fungsi handleSearch saat menekan 'Enter'
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
        disabled={!!shareToken} // Menonaktifkan input jika ada token berbagi
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