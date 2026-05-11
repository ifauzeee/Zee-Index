export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createUserRoute } from "@/lib/api-middleware";
import { authenticator } from "otplib";
import { kv } from "@/lib/kv";
import { checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";
import { getToken } from "next-auth/jwt";

const verifyLoginSchema = z.object({
  token: z.string().min(1, "Kode verifikasi tidak valid."),
});

export const POST = createUserRoute(
  async ({ request, session, body }) => {
    const { success } = await checkRateLimit(request, "AUTH");
    if (!success) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." },
        { status: 429 },
      );
    }

    try {
      const { token } = body;
      const userEmail = session.user.email;

      const nextAuthToken = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: "authjs.session-token",
        secureCookie: process.env.NODE_ENV === "production",
      });

      if (
        !nextAuthToken ||
        !nextAuthToken.twoFactorRequired ||
        !nextAuthToken.sessionId
      ) {
        return NextResponse.json(
          { error: "2FA tidak diperlukan untuk sesi ini." },
          { status: 400 },
        );
      }

      const secret: string | null = await kv.get(`2fa:secret:${userEmail}`);
      if (!secret) {
        return NextResponse.json(
          { error: "Konfigurasi 2FA tidak ditemukan." },
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

      await kv.set(`2fa_passed:${nextAuthToken.sessionId}`, true, { ex: 300 });

      return NextResponse.json({
        success: true,
        message: "2FA berhasil diverifikasi.",
      });
    } catch (error) {
      console.error("2FA Login Verify Error:", error);
      return NextResponse.json(
        { error: "Gagal memverifikasi kode 2FA." },
        { status: 500 },
      );
    }
  },
  { requireEmail: true, rateLimit: false, bodySchema: verifyLoginSchema },
);
