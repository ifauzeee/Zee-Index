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
  
  const { shareToken, currentFolderId } = useAppStore();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (inputValue && inputValue !== currentUrlQuery) {
        performSearch();
      } else if (!inputValue && currentUrlQuery) {
        clearSearch();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue, currentUrlQuery]);

  const performSearch = () => {
    if (!inputValue) return;
    let searchUrl = `/search?q=${encodeURIComponent(inputValue)}`;

    // Mengirim ID folder saat ini ke API
    if (currentFolderId) {
        searchUrl += `&folderId=${currentFolderId}`;
    }

    if (shareToken) {
      searchUrl += `&share_token=${shareToken}`;
    }

    router.push(searchUrl);
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
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
          aria-label="Hapus pencarian"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}