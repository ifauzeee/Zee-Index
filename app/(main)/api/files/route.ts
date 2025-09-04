import { NextResponse } from 'next/server';
import { listFilesFromDrive } from '@/lib/googleDrive';
import { isPrivateFolder, isProtected, verifyFolderToken } from '@/lib/auth';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { jwtVerify } from 'jose';

// Helper to check if the request is authorized via a share token header
async function isShareTokenAuthorized(request: Request): Promise<boolean> {
  const shareToken = request.headers.get('x-share-token');
  if (!shareToken) return false;
  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    await jwtVerify(shareToken, secret);
    return true; // Token is valid
  } catch {
    return false; // Token is invalid or expired
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isShareAuth = await isShareTokenAuthorized(request);

    // If there's no session AND no valid share token auth, deny access
    if (!session && !isShareAuth) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // Determine user role from session, or treat as a non-admin if using a share link
    const userRole = session?.user?.role;
    const canSeeAll = userRole === 'ADMIN';

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
    const pageToken = searchParams.get('pageToken');
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID tidak ditemukan.' }, { status: 400 });
    }
    
    // Password check for protected folders (only for non-admins)
    if (!canSeeAll && isProtected(folderId)) {
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
        if (canSeeAll) return true;
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
        return isFolder ? !isPrivateFolder(file.id) : true;
      })
      .map((file) => ({
        ...file,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
        isProtected: !canSeeAll && isProtected(file.id),
      }));

    return NextResponse.json({
      files: processedFiles,
      nextPageToken: driveResponse.nextPageToken
    });

  } catch (error: any) {
    console.error('[API /api/files ERROR]:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal pada server.', details: error.message },
      { status: 500 }
    );
  }
}