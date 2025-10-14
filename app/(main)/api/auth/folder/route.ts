

import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { getProtectedFolderCredentials } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
    const { success } = await checkRateLimit(request);
    if (!success) {
        return NextResponse.json({ error: 'Terlalu banyak percobaan. Silakan coba lagi nanti.' }, { status: 429 });
    }

    try {
        const { folderId, id, password } = await request.json();
        if (!folderId || !id || !password) {
            return NextResponse.json({ error: 'Folder ID, ID, and password are required.' }, { status: 400 });
        }

        const folderConfig = await getProtectedFolderCredentials(folderId);
        if (!folderConfig) {
            return NextResponse.json({ error: 'Folder ini tidak dikonfigurasi untuk perlindungan atau tidak ditemukan.' }, { status: 404 });
        }

        const isIdValid = crypto.timingSafeEqual(Buffer.from(id), Buffer.from(folderConfig.id));
        const isPasswordValid = crypto.timingSafeEqual(Buffer.from(password), Buffer.from(folderConfig.password));

        if (isIdValid && isPasswordValid) {
            const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
            const token = await new SignJWT({ folderId: folderId })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('1h')
                .sign(secret);
            return NextResponse.json({ success: true, token }, { status: 200 });
        } else {
            return NextResponse.json({ error: 'Invalid credentials for this folder.' }, { status: 401 });
        }
    } catch (error) {
        console.error("Folder Auth API error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}