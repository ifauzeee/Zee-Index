// app/api/files/route.ts
import { NextResponse } from 'next/server';
import { listFilesFromDrive } from '@/lib/googleDrive';
import { isProtected, validateCredentials } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId') || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
  const pageToken = searchParams.get('pageToken');
  const authHeader = request.headers.get('Authorization');

  if (!folderId) {
    return NextResponse.json({ error: 'Folder ID not found.' }, { status: 400 });
  }

  // Logika untuk folder yang dilindungi (opsional, tapi aman untuk dibiarkan)
  if (isProtected(folderId)) {
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required.', protected: true }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    if (!validateCredentials(folderId, token)) {
      return NextResponse.json({ error: 'Invalid credentials.', protected: true }, { status: 401 });
    }
  }

  try {
    const driveResponse = await listFilesFromDrive(folderId, pageToken);

    // Menambahkan status proteksi ke setiap folder dalam daftar
    const filesWithProtectionStatus = driveResponse.files.map((file) => {
      if (file.isFolder && isProtected(file.id)) {
        return { ...file, isProtected: true };
      }
      return file;
    });

    return NextResponse.json({
      files: filesWithProtectionStatus,
      nextPageToken: driveResponse.nextPageToken
    });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch data from Google Drive.', details: error.message },
      { status: 500 }
    );
  }
}