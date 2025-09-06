// components/Search.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Search as SearchIcon, X, Globe } from 'lucide-react';

interface SearchProps {
  onSearchClose?: () => void;
}

export default function Search({ onSearchClose }: SearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentFolderId } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isGlobalSearch, setIsGlobalSearch] = useState(!currentFolderId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set initial search term from URL if present
    const query = searchParams.get('q');
    if (query) {
      setSearchTerm(query);
    }
    // Automatically focus on the search input when it appears
    inputRef.current?.focus();
  }, [searchParams]);

  useEffect(() => {
    // Update global search state based on currentFolderId
    setIsGlobalSearch(!currentFolderId);
  }, [currentFolderId]);

  const performSearch = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (searchTerm.trim()) {
      const params = new URLSearchParams();
      params.set('q', searchTerm.trim());
      
      // Only add folderId if it's NOT a global search
      if (!isGlobalSearch && currentFolderId) {
        params.set('folderId', currentFolderId);
      }
      
      router.push(`/search?${params.toString()}`);
      onSearchClose?.();
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const placeholderText = isGlobalSearch 
    ? "Cari di semua folder..." 
    : "Cari di folder ini...";

  return (
    <form onSubmit={performSearch} className="w-full">
      <div className="relative w-full">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
          <SearchIcon size={20} className="text-muted-foreground" />
        </span>
        <input
          ref={inputRef}
          type="search"
          placeholder={placeholderText}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-20 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute inset-y-0 right-10 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground"
            title="Hapus"
          >
            <X size={18} />
          </button>
        )}
        <button
            type="button"
            onClick={() => setIsGlobalSearch(!isGlobalSearch)}
            className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground"
            title={isGlobalSearch ? "Pencarian Global Aktif" : "Aktifkan Pencarian Global"}
        >
            <Globe size={18} className={isGlobalSearch ? 'text-primary' : ''} />
        </button>
      </div>
    </form>
  );
}