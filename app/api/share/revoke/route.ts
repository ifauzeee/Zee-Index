export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import { REDIS_KEYS } from "@/lib/constants";
import { shareRevokeRequestSchema } from "@/lib/link-payloads";

export const POST = createAdminRoute(async ({ request }) => {
  try {
    const parsedBody = shareRevokeRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "JTI dan expiresAt diperlukan." },
        { status: 400 },
      );
    }

    const { jti, expiresAt } = parsedBody.data;
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

    await kv.set(`${REDIS_KEYS.SHARE_BLOCKED}${jti}`, "blocked", {
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
});
