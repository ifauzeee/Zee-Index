// File: app/(main)/api/admin/logs/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    try {
        // Ambil semua log (bisa ditambahkan paginasi jika data sangat besar)
        const logs: string[] = await kv.zrange(
            'zee-index:activity-log', 
            0, 
            -1, // Ambil semua
            { rev: true } // Urutkan dari yang terbaru
        ); 
        
        return NextResponse.json(logs.map(log => JSON.parse(log)));
    } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        return NextResponse.json({ error: 'Gagal mengambil log aktivitas.' }, { status: 500 });
    }
}