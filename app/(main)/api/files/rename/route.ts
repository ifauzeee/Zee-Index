// FILE: app/(main)/api/files/rename/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { getAccessToken, getFileDetailsFromDrive } from '@/lib/googleDrive';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

const sanitizeString = (str: string) => str.replace(/<[^>]*>?/gm, '');
const renameSchema = z.object({
  fileId: z.string().min(1),
  newName: z.string().min(1, { message: "Nama baru tidak boleh kosong." })
    .transform(val => sanitizeString(val)),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = renameSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Input tidak valid', details: validation.error.issues }, { status: 400 });
    }
    
    const { fileId, newName } = validation.data;
    const fileDetails = await getFileDetailsFromDrive(fileId);

    if (!fileDetails || !fileDetails.parents || fileDetails.parents.length === 0) {
      throw new Error("Tidak dapat menemukan file atau informasi folder induk.");
    }
    const parentId = fileDetails.parents[0];

    const accessToken = await getAccessToken();
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const response = await fetch(driveUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Drive API Error: ${errorData.error?.message || 'Gagal mengubah nama file.'}`);
    }

    revalidateTag(`files-in-folder-${parentId}`);
    const updatedFile = await response.json();
    return NextResponse.json({ success: true, file: updatedFile });
  } catch (error: any) {
    console.error('Rename API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error.', details: error.message }, { status: 500 });
  }
}