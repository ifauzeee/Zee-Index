
import { NextResponse } from 'next/server';
import { getFolderPath } from '@/lib/googleDrive';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');

  if (!folderId) {
    return NextResponse.json({ error: 'Parameter folderId tidak ditemukan.' }, { status: 400 });
  }
  
  
  if (folderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID) {
    return NextResponse.json([]);
  }

  try {
    const path = await getFolderPath(folderId);
    return NextResponse.json(path);
  } catch (error: any) {
    console.error('Folder Path API Error:', error.message);
    return NextResponse.json(
      { error: 'Gagal mengambil jalur folder.', details: error.message },
      { status: 500 }
    );
  }
}