import { NextResponse } from 'next/server';
import { listFilesFromDrive } from '@/lib/googleDrive';
import { isPrivateFolder, isProtected, verifyFolderToken } from '@/lib/auth';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Penanganan eksplisit jika sesi tidak ada
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const userRole = session.user.role;
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
    const pageToken = searchParams.get('pageToken');
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID tidak ditemukan.' }, { status: 400 });
    }

    if (userRole !== 'ADMIN' && isProtected(folderId)) {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.split(' ')[1];
      const isTokenValid = await verifyFolderToken(token || '', folderId);
      
      if (!isTokenValid) {
        return NextResponse.json({ error: 'Authentication required for this folder.', protected: true }, { status: 401 });
      }
    }

    const driveResponse = await listFilesFromDrive(folderId, pageToken);
    
    const processedFiles = driveResponse.files
      .filter((file) => {
        if (userRole === 'ADMIN') return true;
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
        return isFolder ? !isPrivateFolder(file.id) : true;
      })
      .map((file) => ({
        ...file,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
        isProtected: userRole !== 'ADMIN' && isProtected(file.id),
      }));

    return NextResponse.json({
      files: processedFiles,
      nextPageToken: driveResponse.nextPageToken
    });

  } catch (error: any) {
    // Blok catch-all untuk menangani error tak terduga
    console.error('[API /api/files ERROR]:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal pada server.', details: error.message },
      { status: 500 }
    );
  }
}