// app/api/clearcache/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');

    // Contoh: revalidate data untuk path tertentu
    if (target === 'files') {
        revalidateTag('files'); // Tag ini harus Anda definisikan di panggilan fetch Anda
        return NextResponse.json({ success: true, message: 'Cache files telah dibersihkan.' });
    }

    return NextResponse.json({ success: false, message: 'Invalid cache target.' }, { status: 400 });
}