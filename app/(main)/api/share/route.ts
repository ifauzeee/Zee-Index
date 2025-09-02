// app/(main)/api/share/route.ts
import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export async function POST(request: Request) {
    if (process.env.SITE_PROTECTION_ENABLED !== 'true') {
        return NextResponse.json({ error: 'Fitur berbagi tidak aktif.' }, { status: 400 });
    }
    
    try {
        const { path, type, expiresIn } = await request.json();
        if (!path || !type) {
            return NextResponse.json({ error: 'Parameter "path" dan "type" diperlukan.' }, { status: 400 });
        }

        const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
        const jwt = new SignJWT({ path, type })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer('urn:zee-index:issuer')
            .setAudience('urn:zee-index:audience');

        if (type === 'timed' && expiresIn) {
            jwt.setExpirationTime(expiresIn);
        } else if (type === 'session') {
            // Perbaikan: Hapus baris ini agar tautan sesi tanpa batas waktu
            // jwt.setExpirationTime('60s'); 
        } else if (type === 'timed' && !expiresIn) {
            return NextResponse.json({ error: 'Parameter "expiresIn" diperlukan untuk link berwaktu.' }, { status: 400 });
        }

        const token = await jwt.sign(secret);
        
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://${request.headers.get('host')}`;
        const shareableUrl = new URL(path, baseUrl);
        shareableUrl.searchParams.set('share_token', token);

        return NextResponse.json({ shareableUrl: shareableUrl.toString() });
    } catch (error) {
        console.error("Share API error:", error);
        return NextResponse.json({ error: 'Gagal membuat tautan berbagi.' }, { status: 500 });
    }
}