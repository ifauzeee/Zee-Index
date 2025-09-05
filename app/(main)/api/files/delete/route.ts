// File: app/(main)/api/files/delete/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getAccessToken, getFileDetailsFromDrive } from '@/lib/googleDrive';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

const deleteSchema = z.object({
  fileId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = deleteSchema.safeParse(body);

    if (!validation.success) {
      // PERBAIKAN: Gunakan 'issues' bukan 'errors'
      return NextResponse.json({ error: 'Input tidak valid', details: validation.error.issues }, { status: 400 });
    }
    
    const { fileId } = validation.data;

    const fileDetails = await getFileDetailsFromDrive(fileId);
    if (!fileDetails || !fileDetails.parents) {
      throw new Error("Tidak dapat menemukan file atau folder induk.");
    }
    const parentId = fileDetails.parents[0];

    const accessToken = await getAccessToken();
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;

    const response = await fetch(driveUrl, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (response.status !== 204) {
      try {
        const errorData = await response.json();
        throw new Error(`Google Drive API Error: ${errorData.error?.message || 'Gagal menghapus file.'}`);
      } catch (e) {
        throw new Error(`Google Drive API Error: Status ${response.status}`);
      }
    }

    revalidateTag(`files-in-folder-${parentId}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error.', details: error.message }, { status: 500 });
  }
}