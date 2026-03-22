import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import type { ShareLink } from "@/lib/store";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const shareLinksRecords = await db.shareLink.findMany({
      orderBy: { createdAt: "desc" },
    });

    const shareLinks: ShareLink[] = shareLinksRecords.map((record: any) => ({
      id: record.id,
      path: record.path,
      token: record.token,
      jti: record.jti,
      expiresAt: record.expiresAt.toISOString(),
      loginRequired: record.loginRequired,
      itemName: record.itemName,
      isCollection: record.isCollection,
      maxUses: record.maxUses,
      preventDownload: record.preventDownload,
      hasWatermark: record.hasWatermark,
      watermarkText: record.watermarkText,
      viewCount: record.views,
    }));

    return NextResponse.json(shareLinks);
  } catch (error) {
    console.error("Error fetching share links:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar tautan." },
      { status: 500 },
    );
  }
});
