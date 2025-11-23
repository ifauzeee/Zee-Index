import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@/lib/kv";
import type { ShareLink } from "@/lib/store";

export const dynamic = "force-dynamic";

const SHARE_LINKS_KEY = "zee-index:share-links";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const shareLinksData: Record<string, ShareLink> | null =
      await kv.hgetall(SHARE_LINKS_KEY);
    const shareLinks = shareLinksData ? Object.values(shareLinksData) : [];

    return NextResponse.json(shareLinks || []);
  } catch (error) {
    console.error("Error fetching share links:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar tautan." },
      { status: 500 },
    );
  }
}
