import { NextResponse } from 'next/server';
import { getFileDetailsFromDrive } from '@/lib/googleDrive';

; // Ditambahkan

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'Parameter fileId tidak ditemukan.' }, { status: 400 });
  }

  try {
    const details = await getFileDetailsFromDrive(fileId);
    return NextResponse.json(details);
  } catch (error: any) {
    console.error('File Details API Error:', error.message);
    return NextResponse.json(
      { error: 'Gagal mengambil detail file.', details: error.message },
      { status: 500 }
    );
  }
}