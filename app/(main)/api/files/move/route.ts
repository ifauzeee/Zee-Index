// File: app/(main)/api/files/move/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getAccessToken } from '@/lib/googleDrive';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

const moveSchema = z.object({
  fileId: z.string().min(1),
  currentParentId: z.string().min(1),
  newParentId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = moveSchema.safeParse(body);

    if (!validation.success) {
      // PERBAIKAN: Gunakan 'issues' bukan 'errors'
      return NextResponse.json({ error: 'Input tidak valid', details: validation.error.issues }, { status: 400 });
    }
    
    const { fileId, currentParentId, newParentId } = validation.data;
    
    if (currentParentId === newParentId) {
      return NextResponse.json({ success: true, message: 'Folder tujuan sama dengan folder saat ini.' });
    }

    const accessToken = await getAccessToken();
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentId}&removeParents=${currentParentId}`;

    const response = await fetch(driveUrl, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Gagal memindahkan file di Google Drive.');
    }

    revalidateTag(`files-in-folder-${currentParentId}`);
    revalidateTag(`files-in-folder-${newParentId}`);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Move API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error.' }, { status: 500 });
  }
}