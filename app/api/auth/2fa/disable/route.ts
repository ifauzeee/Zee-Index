import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createUserRoute } from "@/lib/api-middleware";
import { disableTwoFactor, getTwoFactorState } from "@/lib/credentials";
import { verifyTotpOnce } from "@/lib/totp";
import { z } from "zod";

export const dynamic = "force-dynamic";

const disable2faSchema = z.object({
  token: z.string().min(1, "Kode verifikasi tidak valid."),
});

export const POST = createUserRoute(
  async ({ session, body }) => {
    // The AUTH limit is applied by the route wrapper (rateLimit option).
    try {
      // requireEmail guarantees an email on the session.
      const userEmail = session.user.email!;
      const { secret } = await getTwoFactorState(userEmail);
      if (!secret) {
        return NextResponse.json(
          { error: "Konfigurasi 2FA tidak ditemukan." },
          { status: 400 },
        );
      }

      const isValid = await verifyTotpOnce(userEmail, body.token, secret);
      if (!isValid) {
        return NextResponse.json(
          { error: "Kode verifikasi tidak valid." },
          { status: 400 },
        );
      }

      await disableTwoFactor(userEmail);

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
  { requireEmail: true, rateLimit: "AUTH", bodySchema: disable2faSchema },
);
