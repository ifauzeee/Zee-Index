// File: app/(main)/api/files/delete/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getAccessToken } from '@/lib/googleDrive';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

export async function POST(request: NextRequest) {
  // Validasi sesi dan peran pengguna di server
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Akses ditolak. Izin admin diperlukan.' }, { status: 403 });
  }

  try {
    const { fileId } = await request.json();
    if (!fileId) {
      return NextResponse.json({ error: 'File ID diperlukan.' }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;

    const response = await fetch(driveUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status !== 204) {
      const errorData = await response.json();
      throw new Error(`Google Drive API Error: ${errorData.error?.message || 'Gagal menghapus file.'}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error.', details: error.message }, { status: 500 });
  }
}