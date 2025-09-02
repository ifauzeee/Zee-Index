// app/(main)/search/page.tsx
"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import FileList from '@/components/FileList';
import Loading from '@/components/Loading';
import { DriveFile } from '@/lib/googleDrive';
import { useAppStore } from '@/lib/store';

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shareToken } = useAppStore(); // Ambil shareToken dari store
  const query = searchParams.get('q');
  
  const [results, setResults] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const url = new URL(`/api/search?q=${encodeURIComponent(query)}`, window.location.origin);
        if (shareToken) {
          url.searchParams.set('share_token', shareToken);
        }
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error('Gagal melakukan pencarian');
        }
        const data = await response.json();
        setResults(data.files || []);
      } catch (error) {
        console.error("Search error:", error);
        alert('Terjadi kesalahan saat mencari file.');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query, shareToken]);

  const createSlug = (name: string) => encodeURIComponent(name.replace(/\s+/g, '-').toLowerCase());
  
  const handleItemClick = (file: DriveFile) => {
    if (file.isFolder) {
      // JIKA FOLDER: Arahkan ke halaman folder
      const folderUrl = `/folder/${file.id}`;
      const urlWithToken = shareToken ? `${folderUrl}?share_token=${shareToken}` : folderUrl;
      router.push(urlWithToken);
    } else {
      // JIKA FILE: Arahkan ke halaman detail file
      const parentFolder = file.parents && file.parents.length > 0 
        ? file.parents[0] 
        : process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
      
      const fileUrl = `/folder/${parentFolder}/file/${file.id}/${createSlug(file.name)}`;
      const urlWithToken = shareToken ? `${fileUrl}?share_token=${shareToken}` : fileUrl;
      router.push(urlWithToken);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">
        Hasil Pencarian untuk: <span className="text-primary">{query}</span>
      </h2>
      {results.length > 0 ? (
        <FileList files={results} onItemClick={handleItemClick} />
      ) : (
        <div className="text-center py-20 text-muted-foreground col-span-full">
          <i className="fas fa-search text-6xl"></i>
          <p className="mt-4">Tidak ada file yang ditemukan dengan kata kunci tersebut.</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SearchResults />
    </Suspense>
  );
}