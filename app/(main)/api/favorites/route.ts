// FILE: app/(main)/api/favorites/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { kv } from '@vercel/kv';
import { getAccessToken, DriveFile } from '@/lib/googleDrive';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
  }

  try {
    const userFavoritesKey = `user:${session.user.email}:favorites`;
    const favoriteIds: string[] = await kv.smembers(userFavoritesKey);
    
    if (!favoriteIds || favoriteIds.length === 0) {
      return NextResponse.json([]);
    }

    const accessToken = await getAccessToken();
    // Query untuk mengambil semua detail file favorit dalam satu panggilan.
    const driveQuery = `trashed=false and (${favoriteIds.map(id => `id='${id}'`).join(' or ')})`;

    const driveUrl = new URL('https://www.googleapis.com/drive/v3/files');
    driveUrl.searchParams.append('q', driveQuery);
    driveUrl.searchParams.append('fields', 'files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, thumbnailLink, hasThumbnail, parents)');
    driveUrl.searchParams.append('pageSize', '1000');

    const response = await fetch(driveUrl.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Gagal mengambil detail file favorit dari Google Drive.');
    }

    const data: { files: DriveFile[] } = await response.json();
    const validFiles = (data.files || []).map(file => ({
      ...file,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    }));
    
    return NextResponse.json(validFiles);

  } catch (error) {
    console.error('Get Favorites API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}