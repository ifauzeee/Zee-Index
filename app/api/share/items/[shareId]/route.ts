import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";
import { createPublicRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import { REDIS_KEYS } from "@/lib/constants";
import { parseShareCollectionItems } from "@/lib/link-payloads";

export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async ({ request, params, session }) => {
    const { shareId } = params;
    const shareToken = request.nextUrl.searchParams.get("share_token");

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

      const isBlocked = await kv.get(
        `${REDIS_KEYS.SHARE_BLOCKED}${payload.jti}`,
      );
      if (isBlocked) {
        return NextResponse.json(
          { error: "Tautan berbagi ini telah dibatalkan." },
          { status: 403 },
        );
      }

      if (payload.loginRequired && !session) {
        return NextResponse.json(
          { error: "Login diperlukan untuk mengakses tautan ini." },
          { status: 401 },
        );
      }

      const items = parseShareCollectionItems(
        await kv.get(`${REDIS_KEYS.SHARE_ITEMS}${shareId}`),
      );

      if (!items) {
        return NextResponse.json(
          { error: "Koleksi tidak ditemukan atau telah kedaluwarsa." },
          { status: 404 },
        );
      }

      const linkDetails = await db.shareLink.findUnique({
        where: { jti: shareId },
      });

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
  },
  { includeSession: true, rateLimit: false },
);
