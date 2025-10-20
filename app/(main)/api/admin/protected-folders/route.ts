import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { kv } from '@vercel/kv';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const PROTECTED_FOLDERS_KEY = 'zee-index:protected-folders';

const sanitizeString = (str: string) => str.replace(/<[^>]*>?/gm, '');

const folderSchema = z.object({
  folderId: z.string().min(5, 'Folder ID tidak valid.').transform(val => sanitizeString(val)),
  id: z.string().min(1, 'ID Pengguna tidak boleh kosong.').transform(val => sanitizeString(val)),
  password: z.string().min(1, 'Password tidak boleh kosong.'),
});

// --- FUNGSI isAdmin DIPERBARUI ---
async function isAdmin(session: any): Promise<boolean> {
    // Percayakan role yang sudah ada di session
    return session?.user?.role === 'ADMIN';
}
// --- AKHIR PEMBARUAN ---

export async function GET(request: NextRequest) {

    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }
    try {
        const folders = await kv.hgetall(PROTECTED_FOLDERS_KEY);
        return NextResponse.json(folders || {});
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const validation = folderSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }

        const { folderId, id, password } = validation.data;
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);


        await kv.hset(PROTECTED_FOLDERS_KEY, { [folderId]: { id, password: hashedPassword } });
        return NextResponse.json({ success: true, message: `Folder ${folderId} berhasil dilindungi.` });
    } catch (error) {
        console.error("Gagal menambah folder terproteksi:", error);
        return NextResponse.json({ error: 'Gagal memproses permintaan.' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {

    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }
    try {
        const { folderId } = await request.json();
        if (!folderId) {
            return NextResponse.json({ error: 'Folder ID diperlukan.' }, { status: 400 });
        }
        await kv.hdel(PROTECTED_FOLDERS_KEY, folderId);
        return NextResponse.json({ success: true, message: `Perlindungan untuk folder ${folderId} telah dihapus.` });
    } catch (error) {
        console.error("Gagal menghapus folder terproteksi:", error);
        return NextResponse.json({ error: 'Gagal memproses permintaan.' }, { status: 500 });
    }
}