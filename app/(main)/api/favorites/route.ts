// FILE: app/(main)/api/favorites/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { kv } from '@vercel/kv';
// Impor DriveFile yang dimodifikasi (kini memiliki 'trashed')
import { DriveFile, getFileDetailsFromDrive } from '@/lib/googleDrive';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
  }

  try {
    const userFavoritesKey = `user:${session.user.email}:favorites`;
    // Mengambil semua ID file favorit dari Vercel KV
    const favoriteIds: string[] = await kv.smembers(userFavoritesKey);
    const validFavoriteIds = favoriteIds.filter(id => id);

    if (validFavoriteIds.length === 0) {
      return NextResponse.json([]);
    }

    // --- PERBAIKAN DIMULAI ---
    // 1. Mengambil detail setiap file secara paralel menggunakan Promise.all.
    const detailPromises = validFavoriteIds.map(id => 
        getFileDetailsFromDrive(id)
    );
    
    const results = await Promise.all(detailPromises);

    // 2. Memfilter file:
    //    - Menghapus hasil yang null (gagal diambil dari Drive).
    //    - Menghapus file yang properti 'trashed'-nya bernilai true (ada di sampah).
    const allFiles: DriveFile[] = results.filter(
        (file): file is DriveFile => file !== null && !file.trashed
    );
    // --- PERBAIKAN SELESAI ---

    const validFiles = allFiles.map(file => ({
      ...file,
      // Memastikan properti 'isFolder' berdasarkan mimeType
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    }));
    
    return NextResponse.json(validFiles);

  } catch (error) {
    console.error('Get Favorites API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}