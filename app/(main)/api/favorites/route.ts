
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { kv } from '@vercel/kv';
import { getFileDetailsFromDrive } from '@/lib/googleDrive';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
  }

  try {
    const userFavoritesKey = `user:${session.user.email}:favorites`;
    const favoriteIds = await kv.smembers(userFavoritesKey);

    if (!favoriteIds || favoriteIds.length === 0) {
      return NextResponse.json([]);
    }

    
    const favoriteFilesDetails = await Promise.all(
      favoriteIds.map(id => getFileDetailsFromDrive(id))
    );

    
    const validFiles = favoriteFilesDetails.filter(file => file !== null);

    return NextResponse.json(validFiles);
  } catch (error) {
    console.error('Get Favorites API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}