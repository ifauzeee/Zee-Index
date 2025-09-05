// File: app/(main)/api/folder/create/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getAccessToken } from '@/lib/googleDrive';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const { folderName, parentId } = await request.json();
    if (!folderName || !parentId) {
      return NextResponse.json({ error: 'Nama folder dan ID induk diperlukan.' }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    };

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fileMetadata),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Gagal membuat folder di Google Drive.');
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Create Folder API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error.' }, { status: 500 });
  }
}