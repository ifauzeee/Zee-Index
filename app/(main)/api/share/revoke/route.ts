import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@/lib/kv";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { jti, expiresAt } = await req.json();

    if (!jti || !expiresAt) {
      return NextResponse.json(
        { error: "JTI dan expiresAt diperlukan." },
        { status: 400 },
      );
    }

    const now = new Date();
    const expirationDate = new Date(expiresAt);
    const expiresInSeconds = Math.round(
      (expirationDate.getTime() - now.getTime()) / 1000,
    );

    if (expiresInSeconds <= 0) {
      return NextResponse.json({
        success: true,
        message: "Tautan sudah kedaluwarsa, tidak perlu diblokir.",
      });
    }

    await kv.set(`zee-index:blocked:${jti}`, "blocked", {
      ex: expiresInSeconds,
    });

    return NextResponse.json({
      success: true,
      message: "Tautan berhasil dibatalkan.",
    });
  } catch (error) {
    console.error("Error revoking share link:", error);
    return NextResponse.json(
      { error: "Gagal membatalkan tautan." },
      { status: 500 },
    );
  }
}
