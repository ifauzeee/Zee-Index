export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { kv } from "@/lib/kv";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { id, jti, expiresAt } = await req.json();
    if (!id || !jti || !expiresAt) {
      return NextResponse.json(
        { error: "ID, JTI, dan expiresAt diperlukan." },
        { status: 400 },
      );
    }

    const now = new Date();
    const expirationDate = new Date(expiresAt);
    const expiresInSeconds = Math.round(
      (expirationDate.getTime() - now.getTime()) / 1000,
    );

    if (expiresInSeconds > 0) {
      await kv.set(`zee-index:blocked:${jti}`, "blocked", {
        ex: expiresInSeconds,
      });
    }

    await db.shareLink
      .delete({
        where: { jti },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Tautan berhasil dibatalkan dan dihapus.",
    });
  } catch (error) {
    console.error("Error deleting share link:", error);
    return NextResponse.json(
      { error: "Gagal menghapus tautan." },
      { status: 500 },
    );
  }
}
