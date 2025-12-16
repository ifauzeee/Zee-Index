import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@/lib/kv";

const SHARE_LINKS_KEY = "zee-index:share-links";

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

    await kv.hdel(SHARE_LINKS_KEY, jti);
    await kv.del(`zee-index:share-view-count:${jti}`);

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
