import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  // This endpoint is ONLY for users with a session, not for share links.
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }

  return NextResponse.json({ user: session.user });
}