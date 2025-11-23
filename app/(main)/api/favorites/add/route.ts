import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const { fileId } = await request.json();
    if (!fileId) {
      return NextResponse.json(
        { error: "fileId diperlukan." },
        { status: 400 },
      );
    }

    const userFavoritesKey = `user:${session.user.email}:favorites`;
    await kv.sadd(userFavoritesKey, fileId);

    return NextResponse.json({
      success: true,
      message: "Ditambahkan ke favorit.",
    });
  } catch (error) {
    console.error("Add Favorite API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error." },
      { status: 500 },
    );
  }
}
