import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import type { ShareLink } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const shareLinksRecords = await db.shareLink.findMany({
      orderBy: { createdAt: "desc" },
    });

    const shareLinks: ShareLink[] = shareLinksRecords.map((record) => ({
      id: record.id,
      path: record.path,
      token: record.token,
      jti: record.jti,
      expiresAt: record.expiresAt.toISOString(),
      loginRequired: record.loginRequired,
      itemName: record.itemName,
      isCollection: record.isCollection,
    }));

    return NextResponse.json(shareLinks);
  } catch (error) {
    console.error("Error fetching share links:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar tautan." },
      { status: 500 },
    );
  }
}
