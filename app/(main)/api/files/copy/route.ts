// File: app/(main)/api/files/copy/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getAccessToken, getFileDetailsFromDrive } from '@/lib/googleDrive';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

const copySchema = z.object({
  fileId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = copySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Input tidak valid', details: validation.error.issues }, { status: 400 });
    }
    
    const { fileId } = validation.data;

    const fileDetails = await getFileDetailsFromDrive(fileId);
    if (!fileDetails || !fileDetails.parents) {
      throw new Error("Tidak dapat menemukan file asli atau folder induknya.");
    }
    const parentId = fileDetails.parents[0];

    const accessToken = await getAccessToken();
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/copy`;

    const response = await fetch(driveUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Salinan dari ${fileDetails.name}` // Memberi nama default untuk salinan
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Drive API Error: ${errorData.error?.message || 'Gagal membuat salinan.'}`);
    }

    // Revalidasi cache agar file baru muncul
    revalidateTag(`files-in-folder-${parentId}`);
    
    const copiedFile = await response.json();
    return NextResponse.json({ success: true, file: copiedFile });
  } catch (error: any) {
    console.error('Copy API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error.', details: error.message }, { status: 500 });
  }
}