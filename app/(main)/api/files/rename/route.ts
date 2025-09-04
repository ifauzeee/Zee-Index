import { NextResponse, NextRequest } from 'next/server';
import { getAccessToken } from '@/lib/googleDrive';

export const dynamic = 'force-dynamic'; // Ditambahkan

export async function POST(request: NextRequest) {
  const userRole = request.headers.get('x-user-role');
  
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Akses ditolak. Izin admin diperlukan.' }, { status: 403 });
  }

  try {
    const { fileId, newName } = await request.json();
    if (!fileId || !newName) {
      return NextResponse.json({ error: 'File ID dan nama baru diperlukan.' }, { status: 400 });
    }

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

    const updatedFile = await response.json();
    return NextResponse.json({ success: true, file: updatedFile });
  } catch (error: any) {
    console.error('Rename API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error.', details: error.message }, { status: 500 });
  }
}