import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createUserRoute } from "@/lib/api-middleware";
import { authenticator } from "otplib";
import { kv } from "@/lib/kv";
import { enableTwoFactor } from "@/lib/credentials";
import { z } from "zod";

const verifyTwoFactorSchema = z.object({
  token: z.string().min(1, "Kode verifikasi tidak valid."),
});

export const POST = createUserRoute(
  async ({ session, body }) => {
    // The AUTH limit is applied by the route wrapper (rateLimit option).
    try {
      const { token } = body;
      // requireEmail guarantees an email on the session.
      const userEmail = session.user.email!;

      const secret: string | null = await kv.get(
        `2fa:secret:temp:${userEmail}`,
      );
      if (!secret) {
        return NextResponse.json(
          { error: "Sesi pembuatan 2FA telah kedaluwarsa." },
          { status: 400 },
        );
      }

      const isValid = authenticator.check(token, secret);
      if (!isValid) {
        return NextResponse.json(
          { error: "Kode verifikasi tidak valid." },
          { status: 400 },
        );
      }

      await enableTwoFactor(userEmail, secret);
      await kv.del(`2fa:secret:temp:${userEmail}`);

      return NextResponse.json({
        success: true,
        message: "2FA berhasil diaktifkan.",
      });
    } catch (error) {
      logger.error({ err: error }, "2FA Verify Error");
      return NextResponse.json(
        { error: "Gagal memverifikasi kode 2FA." },
        { status: 500 },
      );
    }
  },
  { requireEmail: true, rateLimit: "AUTH", bodySchema: verifyTwoFactorSchema },
);
