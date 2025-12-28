import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import type { DriveFile } from "@/lib/drive";
import type { ShareLink } from "@/lib/store";

const SHARE_LINKS_KEY = "zee-index:share-links";

export async function GET(
  req: NextRequest,
  { params }: { params: { shareId: string } },
) {
  const { shareId } = params;
  const shareToken = req.nextUrl.searchParams.get("share_token");

  if (!shareToken) {
    return NextResponse.json(
      { error: "Token berbagi tidak disediakan." },
      { status: 401 },
    );
  }

  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);

    if (payload.jti !== shareId) {
      return NextResponse.json(
        { error: "Token tidak cocok dengan ID koleksi." },
        { status: 403 },
      );
    }

    const isBlocked = await kv.get(`zee-index:blocked:${payload.jti}`);
    if (isBlocked) {
      return NextResponse.json(
        { error: "Tautan berbagi ini telah dibatalkan." },
        { status: 403 },
      );
    }

    if (payload.loginRequired) {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json(
          { error: "Login diperlukan untuk mengakses tautan ini." },
          { status: 401 },
        );
      }
    }

    const items: DriveFile[] | null = await kv.get(
      `zee-index:share-items:${shareId}`,
    );

    if (!items) {
      return NextResponse.json(
        { error: "Koleksi tidak ditemukan atau telah kedaluwarsa." },
        { status: 404 },
      );
    }

    const allLinks: ShareLink[] = (await kv.get(SHARE_LINKS_KEY)) || [];
    const linkDetails = allLinks.find((link) => link.jti === shareId);

    return NextResponse.json({
      items,
      collectionName: linkDetails?.itemName || "Koleksi Bersama",
    });
  } catch (error) {
    console.error("Gagal memvalidasi token koleksi:", error);
    return NextResponse.json(
      { error: "Token berbagi tidak valid atau telah kedaluwarsa." },
      { status: 401 },
    );
  }
}
