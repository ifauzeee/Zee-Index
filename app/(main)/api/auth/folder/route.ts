import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';

export const dynamic = 'force-dynamic'; // Ditambahkan

function safeParseJson(jsonString: string | null) {
    if (!jsonString) return null;
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Gagal parse JSON:", e);
        return null;
    }
}

export async function POST(request: Request) {
    try {
        const { folderId, id, password } = await request.json();
        if (!folderId || !id || !password) {
            return NextResponse.json({ error: 'Folder ID, ID, and password are required.' }, { status: 400 });
        }

        const protectedFoldersConfig = safeParseJson(process.env.PROTECTED_FOLDERS_JSON!);
        if (!protectedFoldersConfig) {
            return NextResponse.json({ error: 'Protected folders are not configured.' }, { status: 500 });
        }

        const folderConfig = protectedFoldersConfig[folderId];
        if (!folderConfig) {
            return NextResponse.json({ error: 'This folder is not configured for protection.' }, { status: 404 });
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