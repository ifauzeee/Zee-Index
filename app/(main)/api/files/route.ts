// File: app/(main)/api/files/route.ts

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { listFilesFromDrive } from '@/lib/googleDrive';
import { isPrivateFolder, isProtected, verifyFolderToken } from '@/lib/auth';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { jwtVerify } from 'jose';
import { kv } from '@/lib/kv';

// Helper untuk memvalidasi share token langsung dari request
async function validateShareToken(request: Request): Promise<boolean> {
  const { searchParams } = new URL(request.url);
  const shareToken = searchParams.get('share_token');
  if (!shareToken) return false;

  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);

    // Verifikasi blocklist di Vercel KV
    if (typeof payload.jti !== 'string') {
        console.error("Token tidak memiliki JTI.");
        return false;
    }
    const isBlocked = await kv.get(`zee-index:blocked:${payload.jti}`);
    if (isBlocked) {
        console.warn(`Akses ditolak untuk token yang diblokir: ${payload.jti}`);
        return false;
    }

    if (payload.loginRequired) {
      const session = await getServerSession(authOptions);
      return !!session;
    }
    return true;
  } catch (error) {
    return false;
  }
}

export async function GET(request: Request) {
  try {
   const session = await getServerSession(authOptions);
    const isShareAuth = await validateShareToken(request);

    if (!session && !isShareAuth) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const userRole = session?.user?.role;
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
    const pageToken = searchParams.get('pageToken');
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID tidak ditemukan.' }, { status: 400 });
    }
    
    const canSeeAll = userRole === 'ADMIN';

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