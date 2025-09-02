// components/Search.tsx
"use client";

import { useState, useEffect, KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search as SearchIcon, X } from 'lucide-react';

export default function Search({ onSearchClose }: { onSearchClose?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUrlQuery = searchParams.get('q');
  const [inputValue, setInputValue] = useState(currentUrlQuery || '');

  useEffect(() => {
    if (currentUrlQuery !== inputValue) {
      setInputValue(currentUrlQuery || '');
    }
  }, [currentUrlQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue && inputValue !== currentUrlQuery) {
        router.push(`/search?q=${encodeURIComponent(inputValue)}`);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, currentUrlQuery, router]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue && inputValue !== currentUrlQuery) {
      e.preventDefault();
      router.push(`/search?q=${encodeURIComponent(inputValue)}`);
    }
  };
  
  const clearSearch = () => {
    setInputValue('');
    if (currentUrlQuery) {
        router.push('/');
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
        placeholder="Cari file di seluruh drive..."
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