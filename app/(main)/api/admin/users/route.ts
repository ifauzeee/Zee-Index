// File: app/admin/api/users/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { kv } from '@vercel/kv';
import { z } from 'zod';

const ADMIN_EMAILS_KEY = 'zee-index:admins';

// Skema validasi
const emailSchema = z.object({
    email: z.string().email('Format email tidak valid.'),
});

// Helper untuk memeriksa apakah user saat ini adalah admin
async function isAdmin(session: any): Promise<boolean> {
    if (session?.user?.role !== 'ADMIN') {
        return false;
    }
    const admins: string[] = await kv.smembers(ADMIN_EMAILS_KEY);
    return admins.includes(session.user.email);
}

// GET: Mendapatkan daftar admin
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    try {
        const adminEmails = await kv.smembers(ADMIN_EMAILS_KEY);
        return NextResponse.json(adminEmails);
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil daftar admin.' }, { status: 500 });
    }
}

// POST: Menambahkan admin baru
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const validation = emailSchema.safeParse(body);

        if (!validation.success) {
            // PERBAIKAN: Gunakan 'issues' bukan 'errors'
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }
        
        const { email } = validation.data;
        await kv.sadd(ADMIN_EMAILS_KEY, email);
        return NextResponse.json({ success: true, message: `Email ${email} telah ditambahkan sebagai admin.` });

    } catch (error) {
        return NextResponse.json({ error: 'Gagal menambahkan admin.' }, { status: 500 });
    }
}

// DELETE: Menghapus admin
export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const validation = emailSchema.safeParse(body);

        if (!validation.success) {
            // PERBAIKAN: Gunakan 'issues' bukan 'errors'
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }

        const { email } = validation.data;

        const admins: string[] = await kv.smembers(ADMIN_EMAILS_KEY);
        if (admins.length <= 1 && admins.includes(email)) {
            return NextResponse.json({ error: 'Tidak dapat menghapus satu-satunya admin yang tersisa.' }, { status: 400 });
        }
        
        await kv.srem(ADMIN_EMAILS_KEY, email);
        return NextResponse.json({ success: true, message: `Email ${email} telah dihapus dari daftar admin.` });

    } catch (error) {
        return NextResponse.json({ error: 'Gagal menghapus admin.' }, { status: 500 });
    }
}