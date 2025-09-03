// app/(main)/api/files/delete/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getAccessToken } from '@/lib/googleDrive';

export async function POST(request: NextRequest) {
  // Ambil peran pengguna dari header permintaan yang disisipkan oleh middleware
  const userRole = request.headers.get('x-user-role');
  
  // Periksa apakah peran pengguna adalah ADMIN
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Akses ditolak. Izin admin diperlukan.' }, { status: 403 });
  }

  try {
    const { fileId } = await request.json();
    if (!fileId) {
      return NextResponse.json({ error: 'File ID diperlukan.' }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    
    // Lakukan permintaan DELETE ke Google Drive API
    const response = await fetch(driveUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // Google Drive API mengembalikan status 204 jika berhasil dihapus
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