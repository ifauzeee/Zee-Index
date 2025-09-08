// components/Search.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Search as SearchIcon, X, Globe, FileText, ScanText } from 'lucide-react';

interface SearchProps {
  onSearchClose?: () => void;
}

export default function Search({ onSearchClose }: SearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentFolderId } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'fullText'>('name');
  const [isGlobalSearch, setIsGlobalSearch] = useState(!currentFolderId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchTerm(query);
    }
    // --- FIX: Baris yang menyebabkan fokus otomatis dihapus ---
    // inputRef.current?.focus(); 
  }, [searchParams]);

  useEffect(() => {
    setIsGlobalSearch(!currentFolderId);
  }, [currentFolderId]);

  const performSearch = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (searchTerm.trim()) {
      const params = new URLSearchParams();
      params.set('q', searchTerm.trim());
      params.set('searchType', searchType);
      
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
    ? "Cari semua file berdasarkan " + (searchType === 'name' ? 'nama...' : 'konten...')
    : "Cari di folder ini berdasarkan " + (searchType === 'name' ? 'nama...' : 'konten...');

  return (
    <form onSubmit={performSearch} className="w-full">
      <div className="relative w-full">
        <button
            type="button"
            onClick={() => setSearchType(prev => prev === 'name' ? 'fullText' : 'name')}
            className="absolute inset-y-0 left-0 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground"
            title={searchType === 'name' ? "Cari berdasarkan nama" : "Cari berdasarkan konten"}
        >
            {searchType === 'name' ? <FileText size={18} /> : <ScanText size={18} className="text-primary" />}
        </button>

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