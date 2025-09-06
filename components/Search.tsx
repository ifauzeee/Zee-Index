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
  
  // BARU: State untuk mode pencarian global
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);

  const { shareToken, currentFolderId } = useAppStore();

  useEffect(() => {
      setInputValue(currentUrlQuery || '');
  }, [currentUrlQuery]);

  const performSearch = () => {
    if (!inputValue) return;
    
    // MODIFIKASI: Arahkan ke API yang berbeda berdasarkan mode pencarian
    let searchUrl = `/search?q=${encodeURIComponent(inputValue)}`;

    if (isGlobalSearch) {
      // Tidak perlu folderId untuk pencarian global
    } else if (currentFolderId) {
      searchUrl += `&folderId=${currentFolderId}`;
    }

    if (shareToken) {
      searchUrl += `&share_token=${shareToken}`;
    }

    router.push(searchUrl);
  };

  const handleSearchTrigger = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  };
  
  const clearSearch = () => {
    setInputValue('');
    let homeUrl = currentFolderId ? `/folder/${currentFolderId}` : '/';
    if (shareToken) {
        homeUrl += `?share_token=${shareToken}`;
    }
    router.push(homeUrl);
    if (onSearchClose) {
      onSearchClose();
    }
  };

  return (
    // MODIFIKASI: Bungkus dengan div untuk menampung checkbox
    <div>
      <div className="relative w-full">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleSearchTrigger} // MODIFIKASI: Gunakan onKeyDown untuk trigger pencarian
          placeholder={isGlobalSearch ? "Cari di semua folder..." : "Cari di folder ini..."}
          className="w-full pl-10 pr-10 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-ring focus:outline-none"
        />
        {inputValue && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground"
            aria-label="Hapus pencarian"
          >
            <X size={20} />
          </button>
        )}
      </div>
      {/* BARU: Checkbox untuk mengaktifkan pencarian global */}
      <div className="flex items-center mt-2 pl-2">
        <input
          type="checkbox"
          id="global-search-checkbox"
          checked={isGlobalSearch}
          onChange={(e) => setIsGlobalSearch(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="global-search-checkbox" className="ml-2 text-sm text-muted-foreground">
          Cari di semua folder
        </label>
      </div>
    </div>
  );
}