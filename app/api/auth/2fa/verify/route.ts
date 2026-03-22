export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createUserRoute } from "@/lib/api-middleware";
import { authenticator } from "otplib";
import { kv } from "@/lib/kv";
import { checkRateLimit } from "@/lib/ratelimit";

export const POST = createUserRoute(
  async ({ request, session }) => {
    const { success } = await checkRateLimit(request, "AUTH");
    if (!success) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." },
        { status: 429 },
      );
    }

    try {
      const { token } = await request.json();
      const userEmail = session.user.email;

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

      await kv.set(`2fa:secret:${userEmail}`, secret);
      await kv.set(`2fa:enabled:${userEmail}`, true);
      await kv.del(`2fa:secret:temp:${userEmail}`);

      return NextResponse.json({
        success: true,
        message: "2FA berhasil diaktifkan.",
      });
    } catch (error) {
      console.error("2FA Verify Error:", error);
      return NextResponse.json(
        { error: "Gagal memverifikasi kode 2FA." },
        { status: 500 },
      );
    }
  },
  { requireEmail: true, rateLimit: false },
);
