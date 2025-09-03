// app/(main)/api/files/route.ts
import { NextResponse } from 'next/server';
import { listFilesFromDrive } from '@/lib/googleDrive';
import { isPrivateFolder, isProtected, verifyFolderToken } from '@/lib/auth';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;
  
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId') || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
  const pageToken = searchParams.get('pageToken');
  
  if (!folderId) {
    return NextResponse.json({ error: 'Folder ID tidak ditemukan.' }, { status: 400 });
  }

  // --- PERBAIKAN LOGIKA DIMULAI DI SINI ---

  // Periksa apakah folder ini terkunci DAN pengguna BUKAN admin.
  if (userRole !== 'ADMIN' && isProtected(folderId)) {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    const isTokenValid = await verifyFolderToken(token || '', folderId);
    
    if (!isTokenValid) {
      // Jika pengguna bukan admin dan token tidak valid, minta otentikasi.
      return NextResponse.json({ error: 'Authentication required for this folder.', protected: true }, { status: 401 });
    }
  }
  // Jika pengguna adalah ADMIN, pemeriksaan di atas akan dilewati.

  try {
    const driveResponse = await listFilesFromDrive(folderId, pageToken);
    
    const processedFiles = driveResponse.files
      .filter((file) => {
        // Logika filter untuk folder privat tetap sama
        if (userRole === 'ADMIN') return true;
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
        return isFolder ? !isPrivateFolder(file.id) : true;
      })
      .map((file) => ({
        ...file,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
        // Properti 'isProtected' hanya bernilai true jika pengguna BUKAN admin.
        // Ini akan menyembunyikan ikon gembok dan mencegah modal muncul untuk admin.
        isProtected: userRole !== 'ADMIN' && isProtected(file.id),
      }));

    return NextResponse.json({
      files: processedFiles,
      nextPageToken: driveResponse.nextPageToken
    });
  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json(
      { error: 'Gagal mengambil data dari Google Drive.', details: error.message },
      { status: 500 }
    );
  }
}