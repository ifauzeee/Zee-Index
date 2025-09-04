import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    // Kembalikan null jika tidak ada sesi, bukan error 401
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: session.user });
}