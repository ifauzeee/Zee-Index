// File: components/SearchResultsList.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import Loading from '@/components/Loading';
import FileList from '@/components/FileList';
import type { DriveFile } from '@/lib/googleDrive';
import { motion } from 'framer-motion';

export default function SearchResultsList() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchTerm = searchParams.get('q');
    const folderId = searchParams.get('folderId');
    const shareToken = useAppStore(state => state.shareToken);

    const [results, setResults] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { addToast } = useAppStore();

    const createSlug = (name: string) => encodeURIComponent(name.replace(/\s+/g, '-').toLowerCase());

    const handleItemClick = useCallback((file: DriveFile) => {
        let destinationUrl = '';
        if (file.isFolder) {
            destinationUrl = `/folder/${file.id}`;
        } else {
            // Asumsi file hasil pencarian selalu punya parent
            destinationUrl = `/folder/${file.parents?.[0]}/file/${file.id}/${createSlug(file.name)}`;
        }
    
        if (shareToken) {
            destinationUrl += `?share_token=${shareToken}`;
        }
    
        router.push(destinationUrl);
    }, [router, shareToken]);

    const handleItemContextMenu = (event: React.MouseEvent<HTMLDivElement>, file: DriveFile) => {
        // Implementasi context menu jika diperlukan di hasil pencarian.
        // Untuk saat ini, kita biarkan kosong.
    };

    const fetchSearchResults = useCallback(async () => {
        if (!searchTerm) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setResults([]);

        try {
            const url = new URL('/api/search', window.location.origin);
            url.searchParams.append('q', searchTerm);
            if (folderId) {
                url.searchParams.append('folderId', folderId);
            }
            if (shareToken) {
                url.searchParams.append('share_token', shareToken);
            }
            
            const response = await fetch(url.toString());
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Gagal mencari file.');
            }

            setResults(data.files);
        } catch (err: any) {
            setError(err.message);
            addToast({ message: err.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, folderId, addToast, shareToken]);

    useEffect(() => {
        fetchSearchResults();
    }, [fetchSearchResults]);

    if (isLoading) {
        return <Loading />;
    }

    if (error) {
        return <div className="text-center py-20 text-red-500">{error}</div>;
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-xl font-bold mb-4">Hasil Pencarian untuk "{searchTerm}"</h1>
            {results.length > 0 ? (
                <FileList 
                    files={results} 
                    onItemClick={handleItemClick} 
                    onItemContextMenu={handleItemContextMenu} 
                />
            ) : (
                <div className="text-center py-20 text-muted-foreground">
                    <i className="fas fa-search text-6xl"></i>
                    <p className="mt-4">Tidak ada file atau folder yang cocok dengan pencarian Anda.</p>
                </div>
            )}
        </motion.div>
    );
}