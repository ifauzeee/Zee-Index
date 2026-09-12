import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import { kv } from "@/lib/kv";
import { REDIS_KEYS } from "@/lib/constants";
import { shareRevokeRequestSchema } from "@/lib/link-payloads";

export const POST = createAdminRoute(
  async ({ body }) => {
    try {
      const { jti, expiresAt } = body;
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

      let persistedRevocation = true;
      try {
        await db.shareLink.update({
          where: { jti },
          data: { revokedAt: new Date() },
        });
      } catch (err) {
        persistedRevocation = false;
        logger.warn({ err, jti }, "ShareLink DB row missing on revoke");
      }

      return NextResponse.json({
        success: true,
        message: "Tautan berhasil dibatalkan.",
        ...(persistedRevocation
          ? {}
          : {
              warning:
                "Perubahan hanya tersimpan sementara. Token akan kembali valid setelah server restart.",
            }),
      });
    } catch (error) {
      logger.error({ err: error }, "Error revoking share link");
      return NextResponse.json(
        { error: "Gagal membatalkan tautan." },
        { status: 500 },
      );
    }
  },
  { bodySchema: shareRevokeRequestSchema },
);
