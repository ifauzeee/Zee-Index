export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import { kv } from "@/lib/kv";
import { REDIS_KEYS } from "@/lib/constants";
import { shareDeleteRequestSchema } from "@/lib/link-payloads";

export const POST = createAdminRoute(async ({ request }) => {
  try {
    const parsedBody = shareDeleteRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "ID, JTI, dan expiresAt diperlukan." },
        { status: 400 },
      );
    }

    const { jti, expiresAt } = parsedBody.data;
    const now = new Date();
    const expirationDate = new Date(expiresAt);
    const expiresInSeconds = Math.round(
      (expirationDate.getTime() - now.getTime()) / 1000,
    );

    if (expiresInSeconds > 0) {
      await kv.set(`${REDIS_KEYS.SHARE_BLOCKED}${jti}`, "blocked", {
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
});
