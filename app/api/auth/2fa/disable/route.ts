import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createUserRoute } from "@/lib/api-middleware";
import { authenticator } from "otplib";
import { kv } from "@/lib/kv";
import { checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const disable2faSchema = z.object({
  token: z.string().min(1, "Kode verifikasi tidak valid."),
});

export const POST = createUserRoute(
  async ({ request, session, body }) => {
    const { success } = await checkRateLimit(request, "AUTH");
    if (!success) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
        { status: 429 },
      );
    }

    try {
      const userEmail = session.user.email;
      const secret: string | null = await kv.get(`2fa:secret:${userEmail}`);
      if (!secret) {
        return NextResponse.json(
          { error: "Konfigurasi 2FA tidak ditemukan." },
          { status: 400 },
        );
      }

      const isValid = authenticator.check(body.token, secret);
      if (!isValid) {
        return NextResponse.json(
          { error: "Kode verifikasi tidak valid." },
          { status: 400 },
        );
      }

      await kv.del(`2fa:secret:${userEmail}`);
      await kv.del(`2fa:enabled:${userEmail}`);

      return NextResponse.json({
        success: true,
        message: "2FA berhasil dinonaktifkan.",
      });
    } catch (error) {
      logger.error({ err: error }, "2FA Disable Error");
      return NextResponse.json(
        { error: "Gagal menonaktifkan 2FA." },
        { status: 500 },
      );
    }
  },
  { requireEmail: true, rateLimit: false, bodySchema: disable2faSchema },
);
