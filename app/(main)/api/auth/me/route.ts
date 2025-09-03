// app/(main)/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]/route";

export async function GET() {
  // Mengambil sesi pengguna secara aman di sisi server
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }

  // Kirim kembali data pengguna (termasuk peran/role) ke client
  return NextResponse.json({ user: session.user });
}